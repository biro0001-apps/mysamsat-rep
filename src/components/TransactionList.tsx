import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Transaction, TransactionStatus } from '@/src/types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Filter, Download, FileText, Edit2, CheckCircle2, Clock, ArrowRight, CheckCircle, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

interface TransactionListProps {
  onEdit?: (transaction: Transaction) => void;
}

export default function TransactionList({ onEdit }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchTransactions();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (t: Transaction, newStatus: TransactionStatus) => {
    if (newStatus === 'Diproses') {
      if (!t.tax_amount || t.tax_amount <= 0 || !t.service_fee || t.service_fee <= 0) {
        alert('Gagal: Box Pembayaran (Total Biaya bayar & Fee Biro) wajib diisi sebelum memproses transaksi.');
        return;
      }
    }
    
    if (newStatus === 'Selesai') {
      const hasAllNewDocs = t.documents?.length > 0 && t.documents.every(doc => doc.new_url);
      if (!hasAllNewDocs) {
        alert('Gagal: Semua dokumen baru (hasil pengurusan) wajib diupload sebelum menyelesaikan transaksi.');
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', t.id);
      if (error) throw error;
      // Real-time will update the list
    } catch (err: any) {
      alert('Gagal memperbarui status: ' + err.message);
    }
  };

  const handleDelete = async (id: string, plate: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus transaksi untuk plat nomor ${plate}? Data yang dihapus tidak dapat dikembalikan.`)) {
      try {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id);
        if (error) throw error;
        alert('Transaksi berhasil dihapus');
      } catch (err: any) {
        alert('Gagal menghapus transaksi: ' + err.message);
      }
    }
  };

  const filteredTransactions = transactions.filter(t => 
    t.owner_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.plate_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBadge = (status: TransactionStatus) => {
    switch (status) {
      case 'Baru':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-100 dark:border-blue-800">
            <Clock className="w-3 h-3" /> Baru
          </span>
        );
      case 'Diproses':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs font-bold border border-amber-100 dark:border-amber-800">
            <ArrowRight className="w-3 h-3" /> Diproses
          </span>
        );
      case 'Selesai':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-emerald-800">
            <CheckCircle className="w-3 h-3" /> Selesai
          </span>
        );
      case 'Dibatalkan':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold border border-red-100 dark:border-red-800">
            <X className="w-3 h-3" /> Dibatalkan
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="border-none shadow-lg dark:bg-slate-900 dark:text-slate-100">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0 pb-7">
        <div>
          <CardTitle>Riwayat Transaksi</CardTitle>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Daftar semua pengurusan STNK yang tercatat.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama atau plat..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full md:w-[250px] bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-blue-500 dark:text-slate-100"
            />
          </div>
          <Button variant="outline" size="icon" className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="dark:border-slate-700 dark:hover:bg-slate-800">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow className="dark:border-slate-800">
                <TableHead className="font-semibold dark:text-slate-400">Status</TableHead>
                <TableHead className="font-semibold dark:text-slate-400">Tanggal</TableHead>
                <TableHead className="font-semibold dark:text-slate-400">Nama Pemilik</TableHead>
                <TableHead className="font-semibold dark:text-slate-400">No. Polisi</TableHead>
                <TableHead className="font-semibold dark:text-slate-400">Layanan</TableHead>
                <TableHead className="font-semibold text-right dark:text-slate-400">Total</TableHead>
                <TableHead className="font-semibold text-right dark:text-slate-400">Laba</TableHead>
                <TableHead className="font-semibold text-center dark:text-slate-400">Dokumen</TableHead>
                <TableHead className="font-semibold text-center dark:text-slate-400">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                    Tidak ada transaksi ditemukan.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors dark:border-slate-800">
                    <TableCell>{getStatusBadge(t.status)}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 text-xs">
                      {format(new Date(t.created_at), 'dd MMM yyyy', { locale: localeId })}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-200">{t.owner_name}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        {t.plate_number}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs text-slate-500 dark:text-slate-500">{t.vehicle_type}</div>
                      <div className="text-sm dark:text-slate-300">{t.service_type}</div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(t.total_amount || 0)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${t.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatCurrency(t.profit || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {t.documents?.map((doc) => (
                          <div key={doc.type} className="flex flex-col items-center gap-0.5" title={doc.type}>
                            <span className="text-[8px] font-black text-slate-400 uppercase">{doc.type}</span>
                            <div className="flex gap-0.5">
                              {doc.old_url && (
                                <a href={doc.old_url} target="_blank" rel="noopener noreferrer" className="p-1 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded hover:text-blue-600 transition-colors">
                                  <FileText className="w-3 h-3" />
                                </a>
                              )}
                              {doc.new_url && (
                                <a href={doc.new_url} target="_blank" rel="noopener noreferrer" className="p-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded hover:text-emerald-700 transition-colors">
                                  <CheckCircle2 className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        {(!t.documents || t.documents.length === 0) && (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {t.status === 'Baru' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleUpdateStatus(t, 'Diproses')}
                            className="h-8 text-[10px] font-bold border-amber-200 text-amber-600 hover:bg-amber-50"
                          >
                            Mulai Proses
                          </Button>
                        )}
                        {t.status === 'Diproses' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleUpdateStatus(t, 'Selesai')}
                            className="h-8 text-[10px] font-bold border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          >
                            Selesaikan
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => onEdit?.(t)}
                          className="text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(t.id, t.plate_number)}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
