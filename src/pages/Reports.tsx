import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subMonths } from 'date-fns';
import { Button } from '../components/ui/Button';

interface ChartData {
  name: string;
  income: number;
  expense: number;
}

interface CategoryData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<ChartData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netBalance: 0,
  });

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user]);

  const fetchReportData = async () => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*, category:categories(name, color)')
        .order('date', { ascending: true });

      if (transactions) {
        processMonthlyData(transactions);
        processCategoryData(transactions);
        calculateStats(transactions);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (transactions: any[]) => {
    const monthsData: Record<string, ChartData> = {};

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, 'MMM yyyy');
      monthsData[monthKey] = { name: monthKey, income: 0, expense: 0 };
    }

    transactions.forEach((transaction) => {
      const monthKey = format(new Date(transaction.date), 'MMM yyyy');
      if (monthsData[monthKey]) {
        if (transaction.type === 'income') {
          monthsData[monthKey].income += Number(transaction.amount);
        } else if (transaction.type === 'expense') {
          monthsData[monthKey].expense += Number(transaction.amount);
        }
      }
    });

    setMonthlyData(Object.values(monthsData));
  };

  const processCategoryData = (transactions: any[]) => {
    const categoryMap: Record<string, { value: number; color: string }> = {};

    transactions
      .filter((t) => t.type === 'expense' && t.category)
      .forEach((transaction) => {
        const categoryName = transaction.category.name;
        const categoryColor = transaction.category.color || COLORS[0];

        if (!categoryMap[categoryName]) {
          categoryMap[categoryName] = { value: 0, color: categoryColor };
        }
        categoryMap[categoryName].value += Number(transaction.amount);
      });

    const data = Object.entries(categoryMap).map(([name, { value, color }]) => ({
      name,
      value,
      color,
    }));

    setCategoryData(data);
  };

  const calculateStats = (transactions: any[]) => {
    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    setStats({
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
    });
  };

  const exportCSV = () => {
    const csvContent = [
      ['Month', 'Income', 'Expense', 'Net'].join(','),
      ...monthlyData.map((row) =>
        [row.name, row.income, row.expense, row.income - row.expense].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-1">Analyze your financial performance</p>
        </div>
        <Button onClick={exportCSV} variant="secondary">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                R$ {stats.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                R$ {stats.totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Net Balance</p>
              <p className={`text-2xl font-bold mt-1 ${stats.netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                R$ {stats.netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Monthly Overview</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="income" fill="#10B981" name="Income" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expense" fill="#EF4444" name="Expense" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Expenses by Category</h2>
          {categoryData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-gray-500">
              No expense data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => {
                    const percent = props.percent || 0;
                    return `${props.name} (${(percent * 100).toFixed(0)}%)`;
                  }}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) =>
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  }
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Income vs Expenses Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} name="Income" />
              <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={3} name="Expense" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
