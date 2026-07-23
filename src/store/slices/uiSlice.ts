import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * UI scope state — small, cross-cutting things that aren't really part of any
 * one domain.
 *
 * `selectedHospitalId` is the SUPER_ADMIN's "viewing as" hospital. When set,
 * the axios request interceptor appends ?hospitalId=<id> to every API call so
 * every list / chart / detail page on the platform reflects only that
 * hospital. Setting it back to null returns to the platform-wide view.
 *
 * Non-SUPER_ADMIN users never read this value (their hospital comes from JWT)
 * — but storing it in shared state is harmless.
 */

const STORAGE_KEY = 'selectedHospitalId';

const readPersisted = (): string | null => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
};

interface UIState {
  selectedHospitalId: string | null;
}

const initialState: UIState = {
  selectedHospitalId: readPersisted(),
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedHospitalId: (state, action: PayloadAction<string | null>) => {
      state.selectedHospitalId = action.payload;
      try {
        if (action.payload) localStorage.setItem(STORAGE_KEY, action.payload);
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore storage failures (private mode etc.)
      }
    },
    clearSelectedHospitalId: (state) => {
      state.selectedHospitalId = null;
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
    },
  },
});

export const { setSelectedHospitalId, clearSelectedHospitalId } = uiSlice.actions;
export default uiSlice.reducer;

/** Read directly from localStorage (used by axios interceptor where redux
 *  isn't available). */
export const getSelectedHospitalIdFromStorage = readPersisted;
