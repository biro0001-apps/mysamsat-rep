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
import { VehicleType, ServiceType, Transaction, TransactionStatus, TransactionDocument } from '@/src/types';
import { Save, RefreshCw, Upload, FileText, X, CheckCircle2, ArrowRight, Clock, CheckCircle } from 'lucide-react';

const VEHICLE_TYPES: VehicleType[] = ['Motor', 'Mobil', 'Truk', 'Bus', 'Lainnya'];
const SERVICE_TYPES: ServiceType[] = [
  'Perpanjangan Tahunan',
  'Ganti Plat (5 Tahunan)',
  'Balik Nama',
  'Mutasi Keluar',
  'Mutasi Masuk',
  'STNK Baru'
];

const DOCUMENT_TYPES = ['BPKB', 'STNK', 'Cek Fisik', 'KTP', 'Lainnya'];

interface TransactionFormProps {
  onSuccess?: () => void;
  editingTransaction?: Transaction | null;
  onCancel?: () => void;
}

export default function TransactionForm({ onSuccess, editingTransaction, onCancel }: TransactionFormProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TransactionStatus>('Baru');
  
  // Files state: { [docType]: File }
  const [oldFiles, setOldFiles] = useState<Record<string, File>>({});
  const [newFiles, setNewFiles] = useState<Record<string, File>>({});

  const [formData, setFormData] = useState({
    owner_name: '',
    plate_number: '',
    vehicle_type: 'Motor' as VehicleType,
    service_type: 'Perpanjangan Tahunan' as ServiceType,
    tax_amount: '',
    service_fee: '',
    estimated_amount: '',
    notes: '',
    selected_docs: [] as string[]
  });

  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (editingTransaction) {
      setStatus(editingTransaction.status);
      setFormData({
        owner_name: editingTransaction.owner_name,
        plate_number: editingTransaction.plate_number,
        vehicle_type: editingTransaction.vehicle_type,
        service_type: editingTransaction.service_type,
        tax_amount: editingTransaction.tax_amount?.toString() || '',
        service_fee: editingTransaction.service_fee?.toString() || '',
        estimated_amount: editingTransaction.estimated_amount?.toString() || '',
        notes: editingTransaction.notes || '',
        selected_docs: editingTransaction.documents?.map(d => d.type) || []
      });
    } else {
      setStatus('Baru');
    }
  }, [editingTransaction]);

  useEffect(() => {
    const tax = parseFloat(formData.tax_amount) || 0;
    const fee = parseFloat(formData.service_fee) || 0;
    setTotalAmount(tax + fee);
  }, [formData.tax_amount, formData.service_fee]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, docType: string, isNew: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isNew) {
        setNewFiles(prev => ({ ...prev, [docType]: file }));
      } else {
        setOldFiles(prev => ({ ...prev, [docType]: file }));
      }
    }
  };

  const toggleDocSelection = (docType: string) => {
    setFormData(prev => ({
      ...prev,
      selected_docs: prev.selected_docs.includes(docType)
        ? prev.selected_docs.filter(d => d !== docType)
        : [...prev.selected_docs, docType]
    }));
  };

  const uploadFile = async (file: File, userId: string, prefix: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}_${Math.random()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
    return publicUrl;
  };

  const formatPlateNumber = (value: string) => {
    // Hapus semua karakter non-alfanumerik dan ubah ke uppercase
    const raw = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    
    // Pisahkan menjadi 3 bagian: Kode Wilayah (1-2 huruf), Nomor (1-4 angka), Seri (1-3 huruf)
    const match = raw.match(/^([A-Z]{0,2})([0-9]{0,4})([A-Z]{0,3})/);
    if (!match) return raw;

    const part1 = match[1];
    const part2 = match[2];
    const part3 = match[3];

    let result = part1;
    if (part2) result += `-${part2}`;
    if (part3) result += `-${part3}`;
    
    return result;
  };

  const handlePlateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlateNumber(e.target.value);
    setFormData({ ...formData, plate_number: formatted });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Prepare documents array
      const documents: TransactionDocument[] = await Promise.all(
        formData.selected_docs.map(async (docType) => {
          const existingDoc = editingTransaction?.documents?.find(d => d.type === docType);
          let old_url = existingDoc?.old_url;
          let new_url = existingDoc?.new_url;

          if (oldFiles[docType]) {
            old_url = await uploadFile(oldFiles[docType], user.id, 'old');
          }
          if (newFiles[docType]) {
            new_url = await uploadFile(newFiles[docType], user.id, 'new');
          }

          return { type: docType, old_url, new_url };
        })
      );

      const transactionData = {
        owner_name: formData.owner_name,
        plate_number: formData.plate_number,
        vehicle_type: formData.vehicle_type,
        service_type: formData.service_type,
        tax_amount: parseFloat(formData.tax_amount) || 0,
        service_fee: parseFloat(formData.service_fee) || 0,
        estimated_amount: parseFloat(formData.estimated_amount) || 0,
        total_amount: totalAmount,
        notes: formData.notes,
        status,
        documents,
        user_id: user.id
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from('transactions')
          .update(transactionData)
          .eq('id', editingTransaction.id);
        if (error) throw error;
        alert('Transaksi berhasil diperbarui!');
      } else {
        const { error } = await supabase.from('transactions').insert([transactionData]);
        if (error) throw error;
        alert('Transaksi berhasil disimpan!');
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      alert('Gagal menyimpan transaksi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStageIndicator = () => (
    <div className="flex items-center justify-center gap-4 mb-8">
      {[
        { id: 'Baru', icon: Clock, label: 'Baru' },
        { id: 'Berjalan', icon: ArrowRight, label: 'Berjalan' },
        { id: 'Selesai', icon: CheckCircle, label: 'Selesai' }
      ].map((stage, idx) => (
        <div key={stage.id} className="flex items-center">
          <div className={`flex flex-col items-center gap-1 ${status === stage.id ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
              status === stage.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200'
            }`}>
              <stage.icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold">{stage.label}</span>
          </div>
          {idx < 2 && <div className="w-12 h-0.5 bg-slate-200 mx-2 mb-4" />}
        </div>
      ))}
    </div>
  );

  return (
    <Card className="border-none shadow-lg dark:bg-slate-900 dark:text-slate-100">
      <CardHeader>
        <CardTitle>{editingTransaction ? 'Update Transaksi' : 'Transaksi Baru'}</CardTitle>
        <CardDescription className="dark:text-slate-400">
          Kelola alur pengurusan STNK dari pendaftaran hingga selesai.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {renderStageIndicator()}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* STAGE 1: DATA DASAR & DOKUMEN LAMA */}
          <div className={`space-y-6 ${status !== 'Baru' && 'opacity-60 pointer-events-none'}`}>
            <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</div>
              <h3 className="font-bold">Data Kendaraan & Dokumen Masuk</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="owner_name">Nama Pemilik</Label>
                <Input
                  id="owner_name"
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
                  placeholder="Contoh: KT-1234-ABC"
                  value={formData.plate_number}
                  onChange={handlePlateChange}
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 font-mono font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis Kendaraan</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(v: VehicleType) => setFormData({ ...formData, vehicle_type: v })}
                >
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Jenis Layanan</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(v: ServiceType) => setFormData({ ...formData, service_type: v })}
                >
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Kelengkapan Dokumen (Upload Dokumen Lama)</Label>
              <div className="grid grid-cols-1 gap-3">
                {DOCUMENT_TYPES.map((docType) => (
                  <div key={docType} className="flex flex-col md:flex-row md:items-center gap-4 p-3 rounded-lg border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <label className="flex items-center gap-3 cursor-pointer min-w-[120px]">
                      <div 
                        onClick={() => toggleDocSelection(docType)}
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          formData.selected_docs.includes(docType)
                            ? 'bg-blue-600 border-blue-600'
                            : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {formData.selected_docs.includes(docType) && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-sm font-medium">{docType}</span>
                    </label>

                    {formData.selected_docs.includes(docType) && (
                      <div className="flex items-center gap-3 flex-1">
                        <Label
                          htmlFor={`upload-old-${docType}`}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          <Upload className="w-3 h-3" />
                          <span>{oldFiles[docType] ? 'Ganti' : 'Upload Dokumen Lama'}</span>
                        </Label>
                        <input
                          id={`upload-old-${docType}`}
                          type="file"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, docType, false)}
                        />
                        {(oldFiles[docType] || editingTransaction?.documents?.find(d => d.type === docType)?.old_url) && (
                          <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                            <FileText className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">
                              {oldFiles[docType]?.name || 'Terupload'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STAGE 2: TRANSAKSI BERJALAN (ESTIMASI) */}
          <div className={`space-y-6 ${status === 'Baru' && 'opacity-40 grayscale'} ${status === 'Selesai' && 'opacity-60 pointer-events-none'}`}>
            <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">2</div>
              <h3 className="font-bold">Estimasi & Pembayaran</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="estimated_amount">Estimasi Biaya (Rp)</Label>
                <Input
                  id="estimated_amount"
                  type="number"
                  value={formData.estimated_amount}
                  onChange={(e) => setFormData({ ...formData, estimated_amount: e.target.value })}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_amount">Bayar Pajak Riil (Rp)</Label>
                <Input
                  id="tax_amount"
                  type="number"
                  value={formData.tax_amount}
                  onChange={(e) => setFormData({ ...formData, tax_amount: e.target.value })}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_fee">Fee Biro (Rp)</Label>
                <Input
                  id="service_fee"
                  type="number"
                  value={formData.service_fee}
                  onChange={(e) => setFormData({ ...formData, service_fee: e.target.value })}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* STAGE 3: SELESAI (DOKUMEN BARU) */}
          <div className={`space-y-6 ${status !== 'Selesai' && 'opacity-40 grayscale'}`}>
            <div className="flex items-center gap-2 pb-2 border-b dark:border-slate-800">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">3</div>
              <h3 className="font-bold">Finalisasi & Dokumen Baru</h3>
            </div>

            <div className="space-y-4">
              <Label>Upload Hasil Pengurusan (Dokumen Baru)</Label>
              <div className="grid grid-cols-1 gap-3">
                {formData.selected_docs.map((docType) => (
                  <div key={`new-${docType}`} className="flex items-center gap-4 p-3 rounded-lg border dark:border-slate-800 bg-emerald-50/30 dark:bg-emerald-900/10">
                    <span className="text-sm font-bold min-w-[100px]">{docType}</span>
                    <div className="flex items-center gap-3 flex-1">
                      <Label
                        htmlFor={`upload-new-${docType}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Upload className="w-3 h-3" />
                        <span>{newFiles[docType] ? 'Ganti' : 'Upload Hasil Baru'}</span>
                      </Label>
                      <input
                        id={`upload-new-${docType}`}
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange(e, docType, true)}
                      />
                      {(newFiles[docType] || editingTransaction?.documents?.find(d => d.type === docType)?.new_url) && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">
                            {newFiles[docType]?.name || 'Terupload'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <Label>Status Transaksi</Label>
              <div className="flex gap-2">
                {(['Baru', 'Berjalan', 'Selesai'] as TransactionStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      status === s 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-500 border dark:border-slate-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Total Tagihan</p>
                <p className="text-2xl font-black text-blue-600">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalAmount)}
                </p>
              </div>
              <div className="flex gap-2">
                {onCancel && (
                  <Button type="button" variant="ghost" onClick={onCancel}>Batal</Button>
                )}
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                  {loading ? 'Memproses...' : <><Save className="w-4 h-4 mr-2" /> Simpan Perubahan</>}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
