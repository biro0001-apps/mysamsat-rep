import { useState, FormEvent, useEffect, ChangeEvent } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { VehicleType, ServiceType } from '@/src/types';
import { Save, RefreshCw, Upload, FileText, X } from 'lucide-react';

const VEHICLE_TYPES: VehicleType[] = ['Motor', 'Mobil', 'Truk', 'Bus', 'Lainnya'];
const SERVICE_TYPES: ServiceType[] = [
  'Perpanjangan Tahunan',
  'Ganti Plat (5 Tahunan)',
  'Balik Nama',
  'Mutasi Keluar',
  'Mutasi Masuk',
  'STNK Baru'
];

export default function TransactionForm({ onSuccess }: { onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    owner_name: '',
    plate_number: '',
    vehicle_type: 'Motor' as VehicleType,
    service_type: 'Perpanjangan Tahunan' as ServiceType,
    tax_amount: '',
    service_fee: '',
    notes: ''
  });

  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    const tax = parseFloat(formData.tax_amount) || 0;
    const fee = parseFloat(formData.service_fee) || 0;
    setTotalAmount(tax + fee);
  }, [formData.tax_amount, formData.service_fee]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      let attachment_url = '';

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath);
        
        attachment_url = publicUrl;
      }

      const { error } = await supabase.from('transactions').insert([
        {
          owner_name: formData.owner_name,
          plate_number: formData.plate_number,
          vehicle_type: formData.vehicle_type,
          service_type: formData.service_type,
          tax_amount: parseFloat(formData.tax_amount),
          service_fee: parseFloat(formData.service_fee),
          total_amount: totalAmount,
          notes: formData.notes,
          attachment_url,
          user_id: user.id
        }
      ]);

      if (error) throw error;

      setFormData({
        owner_name: '',
        plate_number: '',
        vehicle_type: 'Motor',
        service_type: 'Perpanjangan Tahunan',
        tax_amount: '',
        service_fee: '',
        notes: ''
      });
      setFile(null);
      
      if (onSuccess) onSuccess();
      alert('Transaksi berhasil disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none shadow-lg dark:bg-slate-900 dark:text-slate-100">
      <CardHeader>
        <CardTitle>Input Transaksi Baru</CardTitle>
        <CardDescription className="dark:text-slate-400">Masukkan detail pengurusan STNK dan hitung total biaya.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="owner_name">Nama Pemilik</Label>
            <Input
              id="owner_name"
              placeholder="Contoh: Budi Santoso"
              value={formData.owner_name}
              onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
              required
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plate_number">Nomor Polisi</Label>
            <Input
              id="plate_number"
              placeholder="Contoh: B 1234 ABC"
              value={formData.plate_number}
              onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
              required
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicle_type">Jenis Kendaraan</Label>
            <Select
              value={formData.vehicle_type}
              onValueChange={(value: VehicleType) => setFormData({ ...formData, vehicle_type: value })}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                <SelectValue placeholder="Pilih jenis" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                {VEHICLE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_type">Jenis Layanan</Label>
            <Select
              value={formData.service_type}
              onValueChange={(value: ServiceType) => setFormData({ ...formData, service_type: value })}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                <SelectValue placeholder="Pilih layanan" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                {SERVICE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_amount">Bayar Pajak (Rp)</Label>
            <Input
              id="tax_amount"
              type="number"
              placeholder="0"
              value={formData.tax_amount}
              onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
              required
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="service_fee">Fee Biro (Rp)</Label>
            <Input
              id="service_fee"
              type="number"
              placeholder="0"
              value={formData.service_fee}
              onChange={(e) => setFormData({ ...formData, service_fee: e.target.value })}
              required
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="space-y-2">
            <Label>Upload Lampiran (STNK/KTP/Bukti)</Label>
            <div className="flex items-center gap-4">
              <Label
                htmlFor="file-upload"
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>{file ? 'Ganti File' : 'Pilih File'}</span>
              </Label>
              <Input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept="image/*,.pdf"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                  <FileText className="w-4 h-4" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button type="button" onClick={() => setFile(null)}>
                    <X className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Catatan (Opsional)</Label>
            <Input
              id="notes"
              placeholder="Keterangan tambahan..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="dark:bg-slate-800 dark:border-slate-700"
            />
          </div>

          <div className="md:col-span-2 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Pembayaran</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalAmount)}
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    owner_name: '',
                    plate_number: '',
                    vehicle_type: 'Motor',
                    service_type: 'Perpanjangan Tahunan',
                    tax_amount: '',
                    service_fee: '',
                    notes: ''
                  });
                  setFile(null);
                }}
                disabled={loading}
                className="dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Reset
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                {loading ? 'Menyimpan...' : (
                  <><Save className="mr-2 h-4 w-4" /> Simpan Transaksi</>
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
