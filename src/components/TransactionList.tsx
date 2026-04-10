import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Transaction } from '@/src/types';
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
import { Search, Filter, Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

export default function TransactionList() {
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
      if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        alert('Gagal terhubung ke database. Pastikan URL Supabase Anda benar.');
      }
    } finally {
      setLoading(false);
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
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow className="dark:border-slate-800">
                <TableHead className="font-semibold dark:text-slate-400">Tanggal</TableHead>
                <TableHead className="font-semibold dark:text-slate-400">Nama Pemilik</TableHead>
                <TableHead className="font-semibold dark:text-slate-400">No. Polisi</TableHead>
                <TableHead className="font-semibold dark:text-slate-400">Layanan</TableHead>
                <TableHead className="font-semibold text-right dark:text-slate-400">Pajak</TableHead>
                <TableHead className="font-semibold text-right dark:text-slate-400">Fee</TableHead>
                <TableHead className="font-semibold text-right dark:text-slate-400">Total</TableHead>
                <TableHead className="font-semibold text-center dark:text-slate-400">File</TableHead>
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
                    <TableCell className="text-slate-600 dark:text-slate-400">
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
                    <TableCell className="text-right text-slate-600 dark:text-slate-400">
                      {formatCurrency(t.tax_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right text-slate-600 dark:text-slate-400">
                      {formatCurrency(t.service_fee || 0)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(t.total_amount || t.amount || 0)}
                    </TableCell>
                    <TableCell className="text-center">
                      {t.attachment_url ? (
                        <a 
                          href={t.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700">-</span>
                      )}
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
