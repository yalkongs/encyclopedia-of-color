/*
 * CIE 1931 2° Standard Observer Color Matching Functions.
 * Wavelength: 380nm to 780nm, 5nm spacing (81 entries).
 * Source: CIE 015:2018, Table 1; CIE 1931 2° observer.
 *
 * The full 1nm tabulation is available at cvrl.org. The 5nm subset
 * suffices for the visualizations in this prototype phase.
 */

export interface CMFRow {
  lambda: number;  // nm
  xBar: number;
  yBar: number;
  zBar: number;
}

export const CMF_1931_2DEG: ReadonlyArray<CMFRow> = [
  { lambda: 380, xBar: 0.001368, yBar: 0.000039, zBar: 0.006450 },
  { lambda: 385, xBar: 0.002236, yBar: 0.000064, zBar: 0.010550 },
  { lambda: 390, xBar: 0.004243, yBar: 0.000120, zBar: 0.020050 },
  { lambda: 395, xBar: 0.007650, yBar: 0.000217, zBar: 0.036210 },
  { lambda: 400, xBar: 0.014310, yBar: 0.000396, zBar: 0.067850 },
  { lambda: 405, xBar: 0.023190, yBar: 0.000640, zBar: 0.110200 },
  { lambda: 410, xBar: 0.043510, yBar: 0.001210, zBar: 0.207400 },
  { lambda: 415, xBar: 0.077630, yBar: 0.002180, zBar: 0.371300 },
  { lambda: 420, xBar: 0.134380, yBar: 0.004000, zBar: 0.645600 },
  { lambda: 425, xBar: 0.214770, yBar: 0.007300, zBar: 1.039050 },
  { lambda: 430, xBar: 0.283900, yBar: 0.011600, zBar: 1.385600 },
  { lambda: 435, xBar: 0.328500, yBar: 0.016840, zBar: 1.622960 },
  { lambda: 440, xBar: 0.348280, yBar: 0.023000, zBar: 1.747060 },
  { lambda: 445, xBar: 0.348060, yBar: 0.029800, zBar: 1.782600 },
  { lambda: 450, xBar: 0.336200, yBar: 0.038000, zBar: 1.772110 },
  { lambda: 455, xBar: 0.318700, yBar: 0.048000, zBar: 1.744100 },
  { lambda: 460, xBar: 0.290800, yBar: 0.060000, zBar: 1.669200 },
  { lambda: 465, xBar: 0.251100, yBar: 0.073900, zBar: 1.528100 },
  { lambda: 470, xBar: 0.195360, yBar: 0.090980, zBar: 1.287640 },
  { lambda: 475, xBar: 0.142100, yBar: 0.112600, zBar: 1.041900 },
  { lambda: 480, xBar: 0.095640, yBar: 0.139020, zBar: 0.812950 },
  { lambda: 485, xBar: 0.057950, yBar: 0.169300, zBar: 0.616200 },
  { lambda: 490, xBar: 0.032010, yBar: 0.208020, zBar: 0.465180 },
  { lambda: 495, xBar: 0.014700, yBar: 0.258600, zBar: 0.353300 },
  { lambda: 500, xBar: 0.004900, yBar: 0.323000, zBar: 0.272000 },
  { lambda: 505, xBar: 0.002400, yBar: 0.407300, zBar: 0.212300 },
  { lambda: 510, xBar: 0.009300, yBar: 0.503000, zBar: 0.158200 },
  { lambda: 515, xBar: 0.029100, yBar: 0.608200, zBar: 0.111700 },
  { lambda: 520, xBar: 0.063270, yBar: 0.710000, zBar: 0.078250 },
  { lambda: 525, xBar: 0.109600, yBar: 0.793200, zBar: 0.057250 },
  { lambda: 530, xBar: 0.165500, yBar: 0.862000, zBar: 0.042160 },
  { lambda: 535, xBar: 0.225750, yBar: 0.914850, zBar: 0.029840 },
  { lambda: 540, xBar: 0.290400, yBar: 0.954000, zBar: 0.020300 },
  { lambda: 545, xBar: 0.359700, yBar: 0.980300, zBar: 0.013400 },
  { lambda: 550, xBar: 0.433450, yBar: 0.994950, zBar: 0.008750 },
  { lambda: 555, xBar: 0.512050, yBar: 1.000000, zBar: 0.005750 },
  { lambda: 560, xBar: 0.594500, yBar: 0.995000, zBar: 0.003900 },
  { lambda: 565, xBar: 0.678400, yBar: 0.978600, zBar: 0.002750 },
  { lambda: 570, xBar: 0.762100, yBar: 0.952000, zBar: 0.002100 },
  { lambda: 575, xBar: 0.842500, yBar: 0.915400, zBar: 0.001800 },
  { lambda: 580, xBar: 0.916300, yBar: 0.870000, zBar: 0.001650 },
  { lambda: 585, xBar: 0.978600, yBar: 0.816300, zBar: 0.001400 },
  { lambda: 590, xBar: 1.026300, yBar: 0.757000, zBar: 0.001100 },
  { lambda: 595, xBar: 1.056700, yBar: 0.694900, zBar: 0.001000 },
  { lambda: 600, xBar: 1.062200, yBar: 0.631000, zBar: 0.000800 },
  { lambda: 605, xBar: 1.045600, yBar: 0.566800, zBar: 0.000600 },
  { lambda: 610, xBar: 1.002600, yBar: 0.503000, zBar: 0.000340 },
  { lambda: 615, xBar: 0.938400, yBar: 0.441200, zBar: 0.000240 },
  { lambda: 620, xBar: 0.854450, yBar: 0.381000, zBar: 0.000190 },
  { lambda: 625, xBar: 0.751400, yBar: 0.321000, zBar: 0.000100 },
  { lambda: 630, xBar: 0.642400, yBar: 0.265000, zBar: 0.000050 },
  { lambda: 635, xBar: 0.541900, yBar: 0.217000, zBar: 0.000030 },
  { lambda: 640, xBar: 0.447900, yBar: 0.175000, zBar: 0.000020 },
  { lambda: 645, xBar: 0.360800, yBar: 0.138200, zBar: 0.000010 },
  { lambda: 650, xBar: 0.283500, yBar: 0.107000, zBar: 0.000000 },
  { lambda: 655, xBar: 0.218700, yBar: 0.081600, zBar: 0.000000 },
  { lambda: 660, xBar: 0.164900, yBar: 0.061000, zBar: 0.000000 },
  { lambda: 665, xBar: 0.121200, yBar: 0.044580, zBar: 0.000000 },
  { lambda: 670, xBar: 0.087400, yBar: 0.032000, zBar: 0.000000 },
  { lambda: 675, xBar: 0.063600, yBar: 0.023200, zBar: 0.000000 },
  { lambda: 680, xBar: 0.046770, yBar: 0.017000, zBar: 0.000000 },
  { lambda: 685, xBar: 0.032900, yBar: 0.011920, zBar: 0.000000 },
  { lambda: 690, xBar: 0.022700, yBar: 0.008210, zBar: 0.000000 },
  { lambda: 695, xBar: 0.015840, yBar: 0.005723, zBar: 0.000000 },
  { lambda: 700, xBar: 0.011359, yBar: 0.004102, zBar: 0.000000 },
  { lambda: 705, xBar: 0.008111, yBar: 0.002929, zBar: 0.000000 },
  { lambda: 710, xBar: 0.005790, yBar: 0.002091, zBar: 0.000000 },
  { lambda: 715, xBar: 0.004109, yBar: 0.001484, zBar: 0.000000 },
  { lambda: 720, xBar: 0.002899, yBar: 0.001047, zBar: 0.000000 },
  { lambda: 725, xBar: 0.002049, yBar: 0.000740, zBar: 0.000000 },
  { lambda: 730, xBar: 0.001440, yBar: 0.000520, zBar: 0.000000 },
  { lambda: 735, xBar: 0.001000, yBar: 0.000361, zBar: 0.000000 },
  { lambda: 740, xBar: 0.000690, yBar: 0.000249, zBar: 0.000000 },
  { lambda: 745, xBar: 0.000476, yBar: 0.000172, zBar: 0.000000 },
  { lambda: 750, xBar: 0.000332, yBar: 0.000120, zBar: 0.000000 },
  { lambda: 755, xBar: 0.000235, yBar: 0.000085, zBar: 0.000000 },
  { lambda: 760, xBar: 0.000166, yBar: 0.000060, zBar: 0.000000 },
  { lambda: 765, xBar: 0.000117, yBar: 0.000042, zBar: 0.000000 },
  { lambda: 770, xBar: 0.000083, yBar: 0.000030, zBar: 0.000000 },
  { lambda: 775, xBar: 0.000059, yBar: 0.000021, zBar: 0.000000 },
  { lambda: 780, xBar: 0.000042, yBar: 0.000015, zBar: 0.000000 },
];

export const WAVELENGTH_MIN = 380;
export const WAVELENGTH_MAX = 780;
export const WAVELENGTH_STEP = 5;
