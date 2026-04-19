import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Patient {
  id: string;
  uhid: string;
  abhaId?: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email?: string;
}

interface PatientState {
  selectedPatient: Patient | null;
  patients: Patient[];
}

const initialState: PatientState = {
  selectedPatient: null,
  patients: [],
};

const patientSlice = createSlice({
  name: 'patient',
  initialState,
  reducers: {
    setSelectedPatient: (state, action: PayloadAction<Patient | null>) => {
      state.selectedPatient = action.payload;
    },
    setPatients: (state, action: PayloadAction<Patient[]>) => {
      state.patients = action.payload;
    },
  },
});

export const { setSelectedPatient, setPatients } = patientSlice.actions;
export default patientSlice.reducer;
