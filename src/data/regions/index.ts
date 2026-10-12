import type { RegionDef } from "../types";
import { EKDAL } from "./ekdal";

/**
 * Every region in the world. A new area is a new file in this folder with its
 * own origin; regions that touch share terrain seamlessly because heights are
 * computed from world coordinates.
 */
export const REGIONS: RegionDef[] = [EKDAL];
