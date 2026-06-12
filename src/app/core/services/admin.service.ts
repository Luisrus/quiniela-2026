import { inject, Injectable } from '@angular/core';
import {
  collection,
  doc,
  Firestore,
  getDoc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  type CollectionReference,
  type DocumentReference
} from '@angular/fire/firestore';

import type { AdminJugadorUpdate, AdminPronosticoInput } from '../models/admin.model';
import { buildPronosticoId } from '../models/pronostico.model';
import type { Partido, PartidoEstado } from '../models/partido.model';
import type { Usuario, UsuarioTipo } from '../models/usuario.model';
import { actualizarRachas, rachasFromUsuario } from '../utils/calcular-rachas';
import { calcularPuntosPronostico } from '../utils/calcular-puntos';
import { FirestoreErrorService } from './firestore-error.service';
import { ToastService } from './toast.service';

export interface AdminResultadoInput {
  readonly partidoId: string;
  readonly golesLocal: number | null;
  readonly golesVisitante: number | null;
  readonly estado: PartidoEstado;
}

interface StoredPronostico {
  readonly uid: string;
  readonly partidoId: string;
  readonly golesLocal: number;
  readonly golesVisitante: number;
  readonly frase?: string;
  readonly puntosGanados?: number | null;
  readonly puntosProvisionales?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly firestore = inject(Firestore);
  private readonly errors = inject(FirestoreErrorService);
  private readonly toasts = inject(ToastService);
  private readonly partidosCollection = collection(
    this.firestore,
    'partidos'
  ) as CollectionReference<Partido>;
  private readonly pronosticosCollection = collection(
    this.firestore,
    'pronosticos'
  ) as CollectionReference<StoredPronostico>;
  private readonly usuariosCollection = collection(
    this.firestore,
    'usuarios'
  ) as CollectionReference<Usuario>;

  async crearInvitado(nombre: string): Promise<string> {
    const trimmed = nombre.trim();

    if (trimmed === '') {
      throw new Error('El nombre del invitado no puede estar vacío.');
    }

    const uid = buildInvitadoUid(trimmed);

    try {
      await setDoc(this.usuarioRef(uid), {
        uid,
        nombre: trimmed,
        fotoUrl: null,
        tipo: 'invitado' satisfies UsuarioTipo,
        puntos: 0,
        badges: [],
        rachaAciertos: 0,
        rachaAciertosMaxima: 0,
        rachaExactos: 0,
        rachaExactosMaxima: 0
      });
      this.toasts.success(`Invitado "${trimmed}" agregado.`);
      return uid;
    } catch (error: unknown) {
      this.errors.report('No se pudo crear el invitado.', error);
      throw error;
    }
  }

  async actualizarJugador(input: AdminJugadorUpdate): Promise<void> {
    const nombre = input.nombre.trim();

    if (nombre === '') {
      throw new Error('El nombre no puede estar vacío.');
    }

    try {
      await updateDoc(this.usuarioRef(input.uid), {
        nombre,
        tipo: input.tipo
      });
      this.toasts.success('Jugador actualizado.');
    } catch (error: unknown) {
      this.errors.report('No se pudo actualizar el jugador.', error);
      throw error;
    }
  }

  async guardarPronostico(input: AdminPronosticoInput): Promise<void> {
    const pronosticoId = buildPronosticoId(input.uid, input.partidoId);

    try {
      await setDoc(
        doc(this.firestore, 'pronosticos', pronosticoId),
        {
          uid: input.uid,
          partidoId: input.partidoId,
          golesLocal: input.golesLocal,
          golesVisitante: input.golesVisitante
        },
        { merge: true }
      );
    } catch (error: unknown) {
      this.errors.report('No se pudo guardar el pronóstico.', error);
      throw error;
    }

    const partidoSnapshot = await getDoc(this.partidoRef(input.partidoId));

    if (!partidoSnapshot.exists()) {
      this.toasts.success('Pronóstico guardado.');
      return;
    }

    const partido = partidoSnapshot.data();

    if (!partidoTieneResultadoDefinitivo(partido)) {
      this.toasts.success('Pronóstico guardado.');
      return;
    }

    try {
      await this.guardarResultadoYCalcularPuntosUnsafe({
        partidoId: input.partidoId,
        golesLocal: partido.golesLocal,
        golesVisitante: partido.golesVisitante,
        estado: partido.estado
      });
      this.toasts.success('Pronóstico guardado y puntos recalculados.');
    } catch (error: unknown) {
      this.errors.report(
        'Pronóstico guardado, pero no se pudieron recalcular los puntos. Vuelve a guardar el resultado en Resultados.',
        error
      );
    }
  }

  async guardarResultadoYCalcularPuntos(input: AdminResultadoInput): Promise<void> {
    try {
      await this.guardarResultadoYCalcularPuntosUnsafe(input);
      this.toasts.success('Resultado guardado y puntos recalculados.');
    } catch (error: unknown) {
      this.errors.report('No se pudo guardar el resultado. El marcador se puso rebelde.', error);
      throw error;
    }
  }

  private async guardarResultadoYCalcularPuntosUnsafe(
    input: AdminResultadoInput
  ): Promise<void> {
    const pronosticosDelPartidoQuery = query(
      this.pronosticosCollection,
      where('partidoId', '==', input.partidoId)
    );
    const [
      pronosticosDelPartidoSnapshot,
      pronosticosSnapshot,
      usuariosSnapshot
    ] = await Promise.all([
      getDocs(pronosticosDelPartidoQuery),
      getDocs(this.pronosticosCollection),
      getDocs(this.usuariosCollection)
    ]);
    const pronosticoRefsParaActualizar = new Set(
      pronosticosDelPartidoSnapshot.docs.map((snapshot) => snapshot.ref.path)
    );
    const pronosticoRefs = pronosticosSnapshot.docs.map((snapshot) => snapshot.ref);
    const usuarioRefs = usuariosSnapshot.docs.map((snapshot) => snapshot.ref);
    const partidoRef = this.partidoRef(input.partidoId);

    await runTransaction(this.firestore, async (transaction) => {
      const partidoSnapshot = await transaction.get(partidoRef);

      if (!partidoSnapshot.exists()) {
        throw new Error(`No existe el partido ${input.partidoId}.`);
      }

      const pronosticoSnapshots = await Promise.all(
        pronosticoRefs.map((pronosticoRef) => transaction.get(pronosticoRef))
      );
      const usuarioSnapshots = await Promise.all(
        usuarioRefs.map((usuarioRef) => transaction.get(usuarioRef))
      );

      const puntosPorUsuario = new Map<string, number>();
      const puntosPartidoPorUid = new Map<string, number>();

      for (const pronosticoSnapshot of pronosticoSnapshots) {
        if (!pronosticoSnapshot.exists()) {
          continue;
        }

        const pronostico = pronosticoSnapshot.data();
        const esPronosticoDelPartido = pronostico.partidoId === input.partidoId;
        const puntos = esPronosticoDelPartido
          ? calcularPuntosPronostico(pronostico, input)
          : numberOrZero(pronostico.puntosGanados);

        puntosPorUsuario.set(
          pronostico.uid,
          (puntosPorUsuario.get(pronostico.uid) ?? 0) + puntos
        );

        if (esPronosticoDelPartido) {
          puntosPartidoPorUid.set(pronostico.uid, puntos);
        }

        if (esPronosticoDelPartido && pronosticoRefsParaActualizar.has(pronosticoSnapshot.ref.path)) {
          transaction.update(pronosticoSnapshot.ref, { puntosGanados: puntos });
        }
      }

      for (const usuarioSnapshot of usuarioSnapshots) {
        if (!usuarioSnapshot.exists()) {
          continue;
        }

        const usuario = usuarioSnapshot.data();
        const puntosPartido = puntosPartidoPorUid.get(usuario.uid);
        const rachas = puntosPartido === undefined
          ? rachasFromUsuario(usuario)
          : actualizarRachas(rachasFromUsuario(usuario), puntosPartido);

        transaction.update(usuarioSnapshot.ref, {
          puntos: puntosPorUsuario.get(usuario.uid) ?? 0,
          rachaAciertos: rachas.rachaAciertos,
          rachaAciertosMaxima: rachas.rachaAciertosMaxima,
          rachaExactos: rachas.rachaExactos,
          rachaExactosMaxima: rachas.rachaExactosMaxima
        });
      }

      transaction.update(partidoRef, {
        golesLocal: input.golesLocal,
        golesVisitante: input.golesVisitante,
        estado: input.estado,
        puntosCalculados: true
      });
    });
  }

  private partidoRef(id: string): DocumentReference<Partido> {
    return doc(this.partidosCollection, id);
  }

  private usuarioRef(uid: string): DocumentReference<Usuario> {
    return doc(this.usuariosCollection, uid);
  }
}

function buildInvitadoUid(nombre: string): string {
  const slug = nombre
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const suffix = Math.random().toString(36).slice(2, 8);

  return `inv-${slug || 'jugador'}-${suffix}`;
}

function numberOrZero(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function partidoTieneResultadoDefinitivo(partido: Partido): boolean {
  return partido.estado === 'finalizado' &&
    Number.isFinite(partido.golesLocal) &&
    Number.isFinite(partido.golesVisitante);
}
