// @ts-nocheck
import { useGet, usePost } from "./useApi";
import { queryKeys } from "../lib/react-query";

export const useDriverShiftStatus = () => {
  return useGet(
    [...queryKeys.drivers.all, "shift", "status"],
    "/driver/shift/status",
    { enabled: true }
  );
};

export const useDriverShiftToggle = (options = {}) => {
  return usePost(
    [...queryKeys.drivers.all, "shift"],
    "/driver/shift/toggle",
    { successMessage: "Shift updated successfully", ...options }
  );
};

export const useDriverBreakToggle = (options = {}) => {
  return usePost(
    [...queryKeys.drivers.all, "shift"],
    "/driver/shift/break",
    { successMessage: "Break updated successfully", ...options }
  );
};
