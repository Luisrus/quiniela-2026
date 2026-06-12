/**
 * Configuración estática del torneo.
 * Cualquier cambio a estas constantes requiere un nuevo deploy.
 */

/**
 * Momento exacto en que cierra la edición de pronósticos especiales.
 * Corresponde al pitido inicial del primer partido de octavos de final (Mundial 2026).
 */
export const CIERRE_ESPECIALES: Date = new Date('2026-07-04T17:00:00Z');

export interface EquipoMundialista {
  readonly nombre: string;
  readonly bandera: string;
}

/**
 * Los 48 equipos del Mundial 2026 (USA, México, Canadá).
 * Ordenados por grupo/confederación.
 */
export const EQUIPOS_MUNDIALISTAS: readonly EquipoMundialista[] = [
  // CONMEBOL
  { nombre: 'Argentina', bandera: '🇦🇷' },
  { nombre: 'Brasil', bandera: '🇧🇷' },
  { nombre: 'Colombia', bandera: '🇨🇴' },
  { nombre: 'Uruguay', bandera: '🇺🇾' },
  { nombre: 'Ecuador', bandera: '🇪🇨' },
  { nombre: 'Venezuela', bandera: '🇻🇪' },
  // UEFA
  { nombre: 'España', bandera: '🇪🇸' },
  { nombre: 'Francia', bandera: '🇫🇷' },
  { nombre: 'Alemania', bandera: '🇩🇪' },
  { nombre: 'Inglaterra', bandera: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { nombre: 'Portugal', bandera: '🇵🇹' },
  { nombre: 'Países Bajos', bandera: '🇳🇱' },
  { nombre: 'Bélgica', bandera: '🇧🇪' },
  { nombre: 'Italia', bandera: '🇮🇹' },
  { nombre: 'Croacia', bandera: '🇭🇷' },
  { nombre: 'Serbia', bandera: '🇷🇸' },
  { nombre: 'Austria', bandera: '🇦🇹' },
  { nombre: 'Suiza', bandera: '🇨🇭' },
  { nombre: 'Escocia', bandera: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
  { nombre: 'Turquía', bandera: '🇹🇷' },
  { nombre: 'Dinamarca', bandera: '🇩🇰' },
  { nombre: 'República Checa', bandera: '🇨🇿' },
  { nombre: 'Polonia', bandera: '🇵🇱' },
  { nombre: 'Eslovenia', bandera: '🇸🇮' },
  { nombre: 'Eslovaquia', bandera: '🇸🇰' },
  { nombre: 'Georgia', bandera: '🇬🇪' },
  { nombre: 'Albania', bandera: '🇦🇱' },
  { nombre: 'Hungría', bandera: '🇭🇺' },
  { nombre: 'Rumanía', bandera: '🇷🇴' },
  // CONCACAF
  { nombre: 'México', bandera: '🇲🇽' },
  { nombre: 'Estados Unidos', bandera: '🇺🇸' },
  { nombre: 'Canadá', bandera: '🇨🇦' },
  { nombre: 'Costa Rica', bandera: '🇨🇷' },
  { nombre: 'Honduras', bandera: '🇭🇳' },
  { nombre: 'Panamá', bandera: '🇵🇦' },
  { nombre: 'Jamaica', bandera: '🇯🇲' },
  // CAF
  { nombre: 'Marruecos', bandera: '🇲🇦' },
  { nombre: 'Senegal', bandera: '🇸🇳' },
  { nombre: 'Nigeria', bandera: '🇳🇬' },
  { nombre: 'Egipto', bandera: '🇪🇬' },
  { nombre: 'Costa de Marfil', bandera: '🇨🇮' },
  { nombre: 'Mali', bandera: '🇲🇱' },
  { nombre: 'Ghana', bandera: '🇬🇭' },
  // AFC
  { nombre: 'Japón', bandera: '🇯🇵' },
  { nombre: 'Corea del Sur', bandera: '🇰🇷' },
  { nombre: 'Arabia Saudita', bandera: '🇸🇦' },
  { nombre: 'Irán', bandera: '🇮🇷' },
  { nombre: 'Australia', bandera: '🇦🇺' },
  // OFC / Repechaje
  { nombre: 'Nueva Zelanda', bandera: '🇳🇿' },
];

export function banderaEquipo(nombre: string): string {
  if (!nombre) {
    return '';
  }

  return EQUIPOS_MUNDIALISTAS.find((equipo) => equipo.nombre === nombre)?.bandera ?? '';
}

/**
 * Lista de goleadores potenciales del Mundial 2026.
 * Ordenados por popularidad/reconocimiento.
 */
export const GOLEADORES_MUNDIALISTAS: readonly string[] = [
  // Favoritos
  'Kylian Mbappé (FRA)',
  'Erling Haaland (NOR)',
  'Vinicius Jr. (BRA)',
  'Harry Kane (ENG)',
  'Lamine Yamal (ESP)',
  'Pedri (ESP)',
  'Rodri (ESP)',
  // Sudamérica
  'Julián Álvarez (ARG)',
  'Lautaro Martínez (ARG)',
  'Alexis Mac Allister (ARG)',
  'Neymar Jr. (BRA)',
  'Rodrygo (BRA)',
  'Jhon Durán (COL)',
  'James Rodríguez (COL)',
  'Federico Valverde (URU)',
  'Darwin Núñez (URU)',
  // Europa
  'Bukayo Saka (ENG)',
  'Jude Bellingham (ENG)',
  'Phil Foden (ENG)',
  'Bernardo Silva (POR)',
  'Rafael Leão (POR)',
  'Gonçalo Ramos (POR)',
  'Florian Wirtz (GER)',
  'Jamal Musiala (GER)',
  'Kai Havertz (GER)',
  'Robert Lewandowski (POL)',
  'Niclas Füllkrug (GER)',
  'Cody Gakpo (NED)',
  'Xavi Simons (NED)',
  'Romelu Lukaku (BEL)',
  'Lois Openda (BEL)',
  'Rasmus Höjlund (DEN)',
  'Victor Osimhen (NGA)',
  'Khvicha Kvaratskhelia (GEO)',
  // CONCACAF
  'Hirving Lozano (MEX)',
  'Santiago Giménez (MEX)',
  'Christian Pulisic (USA)',
  'Folarin Balogun (USA)',
  'Alphonso Davies (CAN)',
  'Jonathan David (CAN)',
  // Asia / Resto
  'Takumi Minamino (JPN)',
  'Ayase Ueda (JPN)',
  'Son Heung-min (KOR)',
  'Saleh Al-Shehri (KSA)',
];

/**
 * Porteros candidatos al Guante de Oro del Mundial 2026.
 */
export const PORTEROS_MUNDIALISTAS: readonly string[] = [
  'Emiliano Martínez (ARG)',
  'Gerónimo Rulli (ARG)',
  'Alisson (BRA)',
  'Ederson (BRA)',
  'Bento (BRA)',
  'Thibaut Courtois (BEL)',
  'Jordan Pickford (ENG)',
  'Nick Pope (ENG)',
  'Gianluigi Donnarumma (ITA)',
  'Mike Maignan (FRA)',
  'Alphonse Areola (FRA)',
  'Manuel Neuer (GER)',
  'Marc-André ter Stegen (GER)',
  'Unai Simón (ESP)',
  'David Raya (ESP)',
  'Diogo Costa (POR)',
  'José Sá (POR)',
  'Yann Sommer (SUI)',
  'Gregor Kobel (SUI)',
  'Jan Oblak (SLO)',
  'Dominik Livaković (CRO)',
  'Wojciech Szczęsny (POL)',
  'Bart Verbruggen (NED)',
  'André Onana (CMR)',
  'Yassine Bounou (MAR)',
  'Edouard Mendy (SEN)',
  'Mohamed El Shenawy (EGY)',
  'Guglielmo Vicario (ITA)',
  'Matt Turner (USA)',
  'Ethan Horvath (USA)',
  'Maxime Crépeau (CAN)',
  'Guillermo Ochoa (MEX)',
  'Luis Malagón (MEX)',
  'Sergio Rochet (URU)',
  'Keigo Kawamura (JPN)',
  'Jo Hyeon-woo (KOR)',
  'David Ospina (COL)',
  'Camilo Vargas (COL)',
];
