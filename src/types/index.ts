export type VehicleType = 'Motor' | 'Mobil' | 'Truk' | 'Bus' | 'Lainnya';

export type ServiceType = 
  | 'Perpanjangan Tahunan' 
  | 'Ganti Plat (5 Tahunan)' 
  | 'Balik Nama' 
  | 'Mutasi Keluar' 
  | 'Mutasi Masuk' 
  | 'STNK Baru';

export interface Transaction {
  id: string;
  created_at: string;
  user_id: string;
  owner_name: string;
  plate_number: string;
  vehicle_type: VehicleType;
  service_type: ServiceType;
  tax_amount: number;
  service_fee: number;
  total_amount: number;
  attachment_url?: string;
  notes?: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'staff';
}
