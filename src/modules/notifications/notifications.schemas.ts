import { z } from "zod";

/**
 * Notifications modülünde user (routes) ve admin (admin-routes) router'larının
 * paylaştığı zod parçaları. Tek kaynak — enum/şema sürüklenmesini önler.
 */

export const tierEnum = z.enum(["wholesale", "vip_wholesale"]);
export const platformEnum = z.enum(["ios", "android", "web"]);

export const idParamsSchema = z.object({
  id: z.string().min(1),
});
