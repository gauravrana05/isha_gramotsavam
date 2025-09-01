import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { pincodeService } from "@/lib/services/pincodeService";

// Indian states list
const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export const locationRouter = createTRPCRouter({
  getLocationByPincode: publicProcedure
    .input(z.object({ pincode: z.string().length(6) }).optional().default({}))
    .query(async ({ input }) => {
      try {
        const locationData = await pincodeService.getAddressByPincode(input.pincode);
        return locationData;
      } catch (error) {
        return null;
      }
    }),

  getStates: publicProcedure
    .query(async () => {
      return INDIAN_STATES;
    }),

  getDistricts: publicProcedure
    .input(z.object({ state: z.string() }).optional().default({}))
    .query(async ({ input }) => {
      try {
        const districts = await pincodeService.getDistrictsByState(input.state);
        return districts;
      } catch (error) {
        return [];
      }
    }),

  getTaluks: publicProcedure
    .input(z.object({ 
      state: z.string(),
      district: z.string()
    }).optional().default({}))
    .query(async ({ input }) => {
      try {
        const { taluks } = await pincodeService.getTaluksByDistrict(input.state, input.district);
        return taluks;
      } catch (error) {
        return [];
      }
    }),

  getPanchayats: publicProcedure
    .input(z.object({ 
      state: z.string(),
      district: z.string(),
      taluk: z.string()
    }).optional().default({}))
    .query(async ({ input }) => {
      try {
        const panchayats = await pincodeService.getPanchayatsByTaluk(input.state, input.district, input.taluk);
        return panchayats;
      } catch (error) {
        return [];
      }
    }),
});
