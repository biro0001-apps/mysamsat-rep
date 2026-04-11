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
  key?: any;
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
    third_party_fee: '',
    estimated_amount: '',
    notes: '',
    selected_docs: [] as string[]
  });

  const [totalAmount, setTotalAmount] = useState(0);
  const [profit, setProfit] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  const hasAtLeastOneNewDoc = formData.selected_docs.length > 0 && formData.selected_docs.some(docType => 
    newFiles[docType] || editingTransaction?.documents?.find(d => d.type === docType)?.new_url
  );
  const isStage2Disabled = !formData.tax_amount || !formData.service_fee;
  const isStage3Disabled = !hasAtLeastOneNewDoc;

  useEffect(() => {
    if (editingTransaction) {
      setStatus(editingTransaction.status);
      setFormData({
        owner_name: editingTransaction.owner_name,
        plate_number: editingTransaction.plate_number,
        vehicle_type: editingTransaction.vehicle_type,
        service_type: editingTransaction.service_type,
        tax_amount: formatRupiah(editingTransaction.tax_amount?.toString() || ''),
        service_fee: formatRupiah(editingTransaction.service_fee?.toString() || ''),
        third_party_fee: formatRupiah(editingTransaction.third_party_fee?.toString() || ''),
        estimated_amount: formatRupiah(editingTransaction.estimated_amount?.toString() || ''),
        notes: editingTransaction.notes || '',
        selected_docs: editingTransaction.documents?.map(d => d.type) || []
      });
      setIsDirty(false);
    } else {
      setStatus('Baru');
      setFormData({
        owner_name: '',
        plate_number: '',
        vehicle_type: 'Motor',
        service_type: 'Perpanjangan Tahunan',
        tax_amount: '',
        service_fee: '',
        third_party_fee: '',
        estimated_amount: '',
        notes: '',
        selected_docs: []
      });
      setOldFiles({});
      setNewFiles({});
      setIsDirty(false);
    }
  }, [editingTransaction]);

  useEffect(() => {
    const tax = parseRupiah(formData.tax_amount);
    const fee = parseRupiah(formData.service_fee);
    const thirdParty = parseRupiah(formData.third_party_fee);
    setTotalAmount(tax + fee);
    setProfit(fee - thirdParty);
  }, [formData.tax_amount, formData.service_fee, formData.third_party_fee]);

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

  const formatRupiah = (value: string) => {
    const numberString = value.replace(/[^0-9]/g, '');
    if (!numberString) return '';
    const number = parseInt(numberString);
    return new Intl.NumberFormat('id-ID').format(number);
  };

  const parseRupiah = (value: string) => {
    return parseFloat(value.replace(/\./g, '')) || 0;
  };

  const handleCurrencyChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
    const formatted = formatRupiah(e.target.value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
    setIsDirty(true);
  };

  const handlePlateChange = (e: ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPlateNumber(e.target.value);
    setFormData({ ...formData, plate_number: formatted });
    setIsDirty(true);
  };

  const handleCancel = () => {
    if (isDirty) {
      if (confirm('Ada perubahan yang belum disimpan. Apakah Anda ingin membatalkan dan membuang perubahan?')) {
        if (onCancel) onCancel();
      }
    } else {
      if (onCancel) onCancel();
    }
  };

  const handleCancelTransaction = async () => {
    if (!editingTransaction) return;
    if (confirm('Apakah Anda yakin ingin membatalkan transaksi ini? Status akan diubah menjadi Dibatalkan.')) {
      setLoading(true);
      try {
        const { error } = await supabase
          .from('transactions')
          .update({ status: 'Dibatalkan' })
          .eq('id', editingTransaction.id);
        if (error) throw error;
        alert('Transaksi telah dibatalkan');
        if (onSuccess) onSuccess();
      } catch (err: any) {
        alert('Gagal membatalkan transaksi: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.estimated_amount || parseRupiah(formData.estimated_amount) <= 0) {
      alert('Gagal: Nilai Estimasi Biaya wajib diisi.');
      return;
    }

    if (status === 'Diproses' && isStage2Disabled) {
      alert('Gagal: Box Pembayaran (Total Biaya bayar & Fee Biro) wajib diisi untuk status Diproses.');
      return;
    }

    if (status === 'Selesai' && isStage3Disabled) {
      alert('Gagal: Minimal satu dokumen baru wajib diupload untuk status Selesai.');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Prepare documents array
      const allDocTypes = Array.from(new Set([
        ...formData.selected_docs,
        ...Object.keys(oldFiles),
        ...Object.keys(newFiles),
        ...(editingTransaction?.documents?.map(d => d.type) || [])
      ]));

      const documents: TransactionDocument[] = await Promise.all(
        allDocTypes.map(async (docType) => {
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
        tax_amount: parseRupiah(formData.tax_amount),
        service_fee: parseRupiah(formData.service_fee),
        third_party_fee: parseRupiah(formData.third_party_fee),
        profit: profit,
        estimated_amount: parseRupiah(formData.estimated_amount),
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
        setIsDirty(false);
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
        { id: 'Diproses', icon: ArrowRight, label: 'Diproses' },
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
        <div className="mb-10 pt-2">
          {renderStageIndicator()}
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* STAGE 1: DATA DASAR & DOKUMEN LAMA */}
          <div className={`p-8 rounded-3xl border-2 transition-all shadow-sm ${status === 'Baru' ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10 ring-4 ring-blue-500/10' : 'border-slate-100 dark:border-slate-800 opacity-60 pointer-events-none'}`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-blue-200 dark:shadow-none">1</div>
                  <div>
                    <h3 className="font-black text-lg">Data Kendaraan & Dokumen Masuk</h3>
                    <p className="text-xs text-slate-500">Informasi dasar dan berkas fisik yang diterima dari pelanggan.</p>
                  </div>
                </div>
                {status !== 'Baru' && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
              </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="plate_number">Nomor Polisi <span className="text-red-500">*</span></Label>
                <Input
                  id="plate_number"
                  placeholder="Contoh: KT-1234-ABC"
                  value={formData.plate_number}
                  onChange={(e) => {
                    handlePlateChange(e);
                    setIsDirty(true);
                  }}
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 font-mono font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner_name">Nama Pemilik <span className="text-red-500">*</span></Label>
                <Input
                  id="owner_name"
                  value={formData.owner_name}
                  onChange={(e) => {
                    setFormData({ ...formData, owner_name: e.target.value.toUpperCase() });
                    setIsDirty(true);
                  }}
                  required
                  className="dark:bg-slate-800 dark:border-slate-700 uppercase"
                />
              </div>
              <div className="space-y-2">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium leading-none mb-1">Estimasi harga yang diinfokan ke Pelanggan</span>
                  <Label htmlFor="estimated_amount">Estimasi Biaya (Rp) <span className="text-red-500">*</span></Label>
                </div>
                <Input
                  id="estimated_amount"
                  type="text"
                  value={formData.estimated_amount}
                  onChange={(e) => handleCurrencyChange(e, 'estimated_amount')}
                  required
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label>Jenis Kendaraan <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(v: VehicleType) => {
                    setFormData({ ...formData, vehicle_type: v });
                    setIsDirty(true);
                  }}
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
                <Label>Jenis Layanan <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(v: ServiceType) => {
                    setFormData({ ...formData, service_type: v });
                    setIsDirty(true);
                  }}
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
        </div>

          {/* STAGE 2: TRANSAKSI DIPROSES (PEMBAYARAN) */}
          <div className={`p-8 rounded-3xl border-2 transition-all shadow-sm ${status === 'Diproses' ? 'border-amber-500 bg-amber-50/20 dark:bg-amber-900/10 ring-4 ring-amber-500/10' : (status === 'Baru' ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-40 grayscale')} ${status === 'Selesai' && 'opacity-60 pointer-events-none'}`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-amber-200 dark:shadow-none">2</div>
                  <div>
                    <h3 className="font-black text-lg">Pembayaran</h3>
                    <p className="text-xs text-slate-500">Input biaya riil dan fee untuk menghitung laba transaksi.</p>
                  </div>
                </div>
                {status === 'Selesai' && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="tax_amount">Total Biaya bayar (Rp)</Label>
                <Input
                  id="tax_amount"
                  type="text"
                  value={formData.tax_amount}
                  onChange={(e) => handleCurrencyChange(e, 'tax_amount')}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_fee">Fee Biro (Rp)</Label>
                <Input
                  id="service_fee"
                  type="text"
                  value={formData.service_fee}
                  onChange={(e) => handleCurrencyChange(e, 'service_fee')}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="third_party_fee">Fee Pihak Ke-3 (Rp)</Label>
                <Input
                  id="third_party_fee"
                  type="text"
                  value={formData.third_party_fee}
                  onChange={(e) => handleCurrencyChange(e, 'third_party_fee')}
                  className="dark:bg-slate-800 dark:border-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

          {/* STAGE 3: SELESAI (DOKUMEN BARU) */}
          <div className={`p-8 rounded-3xl border-2 transition-all shadow-sm ${status === 'Selesai' ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-900/10 ring-4 ring-emerald-500/10' : (status === 'Diproses' ? 'border-slate-200 dark:border-slate-700' : 'border-slate-100 dark:border-slate-800 opacity-40 grayscale')}`}>
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-emerald-200 dark:shadow-none">3</div>
                  <div>
                    <h3 className="font-black text-lg">Finalisasi & Dokumen Baru</h3>
                    <p className="text-xs text-slate-500">Upload hasil pengurusan untuk diserahkan ke pelanggan.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
              <Label>Upload Hasil Pengurusan (Dokumen Baru)</Label>
              <div className="grid grid-cols-1 gap-3">
                {DOCUMENT_TYPES.map((docType) => (
                  <div key={`new-${docType}`} className="flex flex-col md:flex-row md:items-center gap-4 p-3 rounded-lg border dark:border-slate-800 bg-emerald-50/20 dark:bg-emerald-900/10">
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                        (newFiles[docType] || editingTransaction?.documents?.find(d => d.type === docType)?.new_url)
                          ? 'bg-emerald-600'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}>
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-bold">{docType}</span>
                    </div>

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
                          <FileText className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">
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
        </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {editingTransaction && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleCancelTransaction}
                  className="bg-red-950/40 hover:bg-red-950/60 text-red-200 border border-red-900/30 px-6"
                >
                  Batalkan Transaksi
                </Button>
              )}
              
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] font-bold uppercase text-slate-500 ml-1">Status</Label>
                <Select 
                  value={status} 
                  onValueChange={(v: TransactionStatus) => {
                    if (v === 'Diproses' && isStage2Disabled) {
                      alert('Tahap Diproses terkunci: Mohon isi rincian di box Pembayaran terlebih dahulu.');
                      return;
                    }
                    if (v === 'Selesai' && isStage3Disabled) {
                      alert('Tahap Selesai terkunci: Mohon upload minimal satu Dokumen Baru terlebih dahulu.');
                      return;
                    }
                    setStatus(v);
                    setIsDirty(true);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-10 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baru">Baru</SelectItem>
                    <SelectItem value="Diproses">Diproses</SelectItem>
                    <SelectItem value="Selesai">Selesai</SelectItem>
                    <SelectItem value="Dibatalkan">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                {onCancel && (
                  <Button type="button" variant="ghost" onClick={handleCancel} className="font-bold text-slate-600 dark:text-slate-300">Batal</Button>
                )}
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 rounded-xl shadow-lg shadow-blue-500/20 font-bold">
                  {loading ? 'Memproses...' : <><Save className="w-5 h-5 mr-2" /> Simpan Perubahan</>}
                </Button>
              </div>

              <div className="text-right min-w-[120px]">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Total Tagihan</p>
                <p className="text-4xl font-black text-blue-600 leading-none">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalAmount).replace('Rp', 'Rp ')}
                </p>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
