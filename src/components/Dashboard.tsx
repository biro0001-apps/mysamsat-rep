import { useState, useEffect } from 'react';
import { supabase } from '@/src/lib/supabase';
import { Transaction } from '@/src/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  Calendar as CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle
} from 'lucide-react';
import { startOfDay, endOfDay, startOfMonth, endOfMonth, format, subMonths, isWithinInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*');
      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const todayTransactions = transactions.filter(t => 
    isWithinInterval(new Date(t.created_at), { start: startOfDay(now), end: endOfDay(now) })
  );
  const thisMonthTransactions = transactions.filter(t => 
    isWithinInterval(new Date(t.created_at), { start: startOfMonth(now), end: endOfMonth(now) })
  );

  const totalRevenue = transactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const todayRevenue = todayTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const monthRevenue = thisMonthTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0);
  const totalProfit = transactions.reduce((sum, t) => sum + (t.profit || 0), 0);
  const monthProfit = thisMonthTransactions.reduce((sum, t) => sum + (t.profit || 0), 0);

  const statusCounts = transactions.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, { 'Baru': 0, 'Berjalan': 0, 'Selesai': 0, 'Dibatalkan': 0 } as Record<string, number>);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Data for Bar Chart (Last 6 Months)
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(now, 5 - i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const monthTransactions = transactions.filter(t => 
      isWithinInterval(new Date(t.created_at), { start: monthStart, end: monthEnd })
    );
    return {
      name: format(date, 'MMM', { locale: localeId }),
      total: monthTransactions.reduce((sum, t) => sum + (t.total_amount || 0), 0),
      profit: monthTransactions.reduce((sum, t) => sum + (t.profit || 0), 0)
    };
  });

  // Data for Pie Chart (Vehicle Types)
  const vehicleData = Object.entries(
    transactions.reduce((acc, t) => {
      acc[t.vehicle_type] = (acc[t.vehicle_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const stats = [
    {
      title: 'Laba Bersih Bulan Ini',
      value: formatCurrency(monthProfit),
      icon: TrendingUp,
      trend: '+15.2%',
      trendUp: true,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    {
      title: 'Total Laba',
      value: formatCurrency(totalProfit),
      icon: TrendingUp,
      trend: '+10.4%',
      trendUp: true,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      title: 'Total Transaksi',
      value: transactions.length.toString(),
      icon: Users,
      trend: '+5.4%',
      trendUp: true,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20'
    },
    {
      title: 'Omzet Bulan Ini',
      value: formatCurrency(monthRevenue),
      icon: CreditCard,
      trend: '+8.2%',
      trendUp: true,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Status Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Transaksi Baru', count: statusCounts['Baru'], color: 'bg-blue-600', icon: Clock },
          { label: 'Sedang Berjalan', count: statusCounts['Berjalan'], color: 'bg-amber-500', icon: ArrowUpRight },
          { label: 'Selesai', count: statusCounts['Selesai'], color: 'bg-emerald-600', icon: CheckCircle }
        ].map((item, i) => (
          <Card key={i} className="border-none shadow-sm dark:bg-slate-900 overflow-hidden group">
            <div className={`h-1 w-full ${item.color}`} />
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                <h3 className="text-3xl font-black mt-1">{item.count}</h3>
              </div>
              <div className={`p-4 rounded-2xl ${item.color} text-white shadow-lg shadow-slate-200 dark:shadow-none group-hover:scale-110 transition-transform`}>
                <item.icon className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow dark:bg-slate-900 dark:text-slate-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`${stat.bg} p-3 rounded-2xl`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${stat.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stat.trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.trend}
                </div>
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{stat.title}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stat.value}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-none shadow-sm dark:bg-slate-900 dark:text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Tren Pendapatan Bulanan</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last6Months}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `Rp${value/1000000}jt`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Bar dataKey="total" name="Omzet" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Laba" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicle Type Chart */}
        <Card className="border-none shadow-sm dark:bg-slate-900 dark:text-slate-100">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Jenis Kendaraan</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehicleData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vehicleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: '#1e293b', color: '#f8fafc' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4 w-full px-4">
              {vehicleData.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
