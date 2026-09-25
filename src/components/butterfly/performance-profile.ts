export type PerformanceProfile = {
  particleCount: number;
  bodyParticleCount: number;
  antennaParticleCount: number;
  trailParticleCount: number;
  tunnelParticleCount: number;
  walkerParticleCount: number;
  walkGroundParticleCount: number;
  walkDustParticleCount: number;
  passButterflyParticleCount: number;
  meadowParticleCount: number;
  pixelRatioCap: number;
  columnSampleWidth: number;
};

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
};

type DeviceNavigator = Navigator & {
  connection?: NetworkInformation;
  deviceMemory?: number;
};

const HIGH: PerformanceProfile = {
  particleCount: 64_000,
  bodyParticleCount: 5_200,
  antennaParticleCount: 240,
  trailParticleCount: 2_600,
  tunnelParticleCount: 2_200,
  walkerParticleCount: 40_000,
  walkGroundParticleCount: 6_000,
  walkDustParticleCount: 1_500,
  passButterflyParticleCount: 9_000,
  meadowParticleCount: 72_000,
  pixelRatioCap: 2,
  columnSampleWidth: 520,
};

const BALANCED: PerformanceProfile = {
  particleCount: 38_000,
  bodyParticleCount: 3_400,
  antennaParticleCount: 160,
  trailParticleCount: 1_200,
  tunnelParticleCount: 1_200,
  walkerParticleCount: 24_000,
  walkGroundParticleCount: 4_000,
  walkDustParticleCount: 1_000,
  passButterflyParticleCount: 6_000,
  meadowParticleCount: 42_000,
  pixelRatioCap: 1.5,
  columnSampleWidth: 380,
};

const LOW: PerformanceProfile = {
  particleCount: 22_000,
  bodyParticleCount: 2_200,
  antennaParticleCount: 100,
  trailParticleCount: 500,
  tunnelParticleCount: 600,
  walkerParticleCount: 12_000,
  walkGroundParticleCount: 2_200,
  walkDustParticleCount: 600,
  passButterflyParticleCount: 3_500,
  meadowParticleCount: 20_000,
  pixelRatioCap: 1,
  columnSampleWidth: 280,
};

export function getPerformanceProfile(): PerformanceProfile {
  const device = navigator as DeviceNavigator;
  const connection = device.connection;
  const narrowViewport = window.matchMedia("(max-width: 760px)").matches;
  const veryNarrowViewport = window.matchMedia("(max-width: 480px)").matches;
  const limitedCpu = (device.hardwareConcurrency ?? 8) <= 4;
  const limitedMemory = (device.deviceMemory ?? 8) <= 4;
  const constrainedNetwork = connection?.saveData === true
    || connection?.effectiveType === "slow-2g"
    || connection?.effectiveType === "2g";

  if (constrainedNetwork || veryNarrowViewport || (limitedCpu && limitedMemory)) return LOW;
  if (narrowViewport || limitedCpu || limitedMemory) return BALANCED;
  return HIGH;
}
