import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Database, TrendingUp, Users, CreditCard, Download, Settings, BarChart3, RefreshCw, AlertCircle } from 'lucide-react';

const BankingDashboard = () => {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [chartType, setChartType] = useState('bar');
  const [timeRange, setTimeRange] = useState('month');
  const [customerData, setCustomerData] = useState([]);
  const [insights, setInsights] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiBaseUrl, setApiBaseUrl] = useState('http://127.0.0.1:8000/api/transactions');

  // API Integration Functions
  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      console.error('API call failed:', err);
      throw err;
    }
  };

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const response = await apiCall('/');
      setCustomerData(response || []);
      calculateInsights(response || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch customer data from database');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const calculateInsights = (data) => {
    if (!data.length) return;

    const customerStats = data.reduce((acc, curr) => {
      if (!acc[curr.customer_id]) {
        acc[curr.customer_id] = {
          name: curr.customer_name || `Customer ${curr.customer_id}`,
          totalTransactions: 0,
          totalAmount: 0,
          months: [],
          type: curr.customer_type || 'Standard',
          firstSeen: curr.month,
          lastSeen: curr.month
        };
      }
      acc[curr.customer_id].totalTransactions += curr.transaction_count || 1;
      acc[curr.customer_id].totalAmount += curr.amount || 0;
      acc[curr.customer_id].months.push({
        month: curr.month,
        transactions: curr.transaction_count || 1,
        amount: curr.amount || 0
      });
      
      if (curr.month < acc[curr.customer_id].firstSeen) {
        acc[curr.customer_id].firstSeen = curr.month;
      }
      if (curr.month > acc[curr.customer_id].lastSeen) {
        acc[curr.customer_id].lastSeen = curr.month;
      }
      
      return acc;
    }, {});

    const monthlyData = data.reduce((acc, curr) => {
      if (!acc[curr.month]) {
        acc[curr.month] = {
          totalTransactions: 0,
          totalAmount: 0,
          uniqueCustomers: new Set()
        };
      }
      acc[curr.month].totalTransactions += curr.transaction_count || 1;
      acc[curr.month].totalAmount += curr.amount || 0;
      acc[curr.month].uniqueCustomers.add(curr.customer_id);
      return acc;
    }, {});

    const monthlyStats = Object.entries(monthlyData).map(([month, stats]) => ({
      month,
      transactions: stats.totalTransactions,
      amount: stats.totalAmount,
      customers: stats.uniqueCustomers.size
    })).sort((a, b) => a.month.localeCompare(b.month));

    const avgTransactions = monthlyStats.reduce((sum, m) => sum + m.transactions, 0) / monthlyStats.length;
    const spikes = monthlyStats.filter(m => m.transactions > avgTransactions * 1.5);

    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoStr = threeMonthsAgo.toISOString().slice(0, 7);

    const activeCustomers = Object.values(customerStats).filter(c => c.lastSeen >= threeMonthsAgoStr);
    const inactiveCustomers = Object.values(customerStats).filter(c => c.lastSeen < threeMonthsAgoStr);

    const transactionFrequency = Object.values(customerStats).reduce((acc, customer) => {
      const monthCount = customer.months.length;
      const avgPerMonth = customer.totalTransactions / monthCount;
      
      if (avgPerMonth >= 10) acc.high++;
      else if (avgPerMonth >= 5) acc.medium++;
      else if (avgPerMonth >= 1) acc.low++;
      else acc.inactive++;
      
      return acc;
    }, { high: 0, medium: 0, low: 0, inactive: 0 });

    const customerLifetime = Object.values(customerStats).map(customer => {
      const firstMonth = new Date(customer.firstSeen + '-01');
      const lastMonth = new Date(customer.lastSeen + '-01');
      const monthsDiff = (lastMonth.getFullYear() - firstMonth.getFullYear()) * 12 + 
                        (lastMonth.getMonth() - firstMonth.getMonth()) + 1;
      return {
        ...customer,
        lifetimeMonths: monthsDiff,
        avgMonthlyTransactions: customer.totalTransactions / monthsDiff,
        avgMonthlyAmount: customer.totalAmount / monthsDiff
      };
    });

    setInsights({
      customerStats,
      totalCustomers: Object.keys(customerStats).length,
      avgTransactionsPerCustomer: Object.values(customerStats).reduce((sum, c) => sum + c.totalTransactions, 0) / Object.keys(customerStats).length,
      totalVolume: Object.values(customerStats).reduce((sum, c) => sum + c.totalAmount, 0),
      monthlyStats,
      spikes,
      activeCustomers: activeCustomers.length,
      inactiveCustomers: inactiveCustomers.length,
      retentionRate: (activeCustomers.length / Object.keys(customerStats).length * 100).toFixed(1),
      transactionFrequency,
      customerLifetime,
      avgLifetimeMonths: (customerLifetime.reduce((sum, c) => sum + c.lifetimeMonths, 0) / customerLifetime.length).toFixed(1)
    });
  };

  const getChartData = () => {
    if (!customerData.length) return [];
    return insights.monthlyStats || [];
  };

  const getCustomerRetentionData = () => {
    if (!Object.keys(insights).length) return [];
    
    return Object.entries(insights.customerStats || {}).map(([id, data]) => ({
      customerId: id.slice(-3),
      name: data.name,
      totalTransactions: data.totalTransactions,
      avgMonthly: (data.totalTransactions / data.months.length).toFixed(1),
      type: data.type,
      amount: data.totalAmount
    }));
  };

  const COLORS = ['#00205B', '#0066CC', '#4A90E2', '#7BB3F0', '#B8D4F1'];

  const Navigation = () => (
    <nav style={{
      backgroundColor: '#00205B',
      padding: '1rem 2rem',
      borderBottom: '3px solid #DC2626',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div>
            <div style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>HSBC</div>
            <div style={{ color: '#B8D4F1', fontSize: '0.9rem' }}>Banking Analytics Platform</div>
          </div>
          {loading && <RefreshCw style={{ animation: 'spin 1s linear infinite', color: '#4A90E2' }} size={18} />}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setCurrentScreen('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: currentScreen === 'dashboard' ? '#DC2626' : 'transparent',
              color: 'white',
              border: '1px solid',
              borderColor: currentScreen === 'dashboard' ? '#DC2626' : '#4A90E2',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <BarChart3 size={18} />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setCurrentScreen('insights')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: currentScreen === 'insights' ? '#DC2626' : 'transparent',
              color: 'white',
              border: '1px solid',
              borderColor: currentScreen === 'insights' ? '#DC2626' : '#4A90E2',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <TrendingUp size={18} />
            <span>Insights</span>
          </button>
          <button
            onClick={() => setCurrentScreen('settings')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: currentScreen === 'settings' ? '#DC2626' : 'transparent',
              color: 'white',
              border: '1px solid',
              borderColor: currentScreen === 'settings' ? '#DC2626' : '#4A90E2',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </nav>
  );

  const ErrorDisplay = ({ message, onRetry }) => (
    <div style={{
      backgroundColor: '#FEE2E2',
      border: '1px solid #DC2626',
      borderRadius: '8px',
      padding: '1rem',
      margin: '1rem 0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem'
      }}>
        <AlertCircle style={{ color: '#DC2626' }} size={20} />
        <span style={{ color: '#DC2626', fontWeight: 'bold' }}>Error</span>
      </div>
      <p style={{ color: '#991B1B', margin: '0 0 1rem 0' }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            backgroundColor: '#DC2626',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      )}
    </div>
  );

  const SettingsScreen = () => (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          color: '#00205B'
        }}>API Configuration</h2>
        
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#374151'
            }}>Django API Base URL</label>
            <input
              type="text"
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
              placeholder="http://localhost:8000/api"
            />
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              onClick={fetchCustomerData}
              disabled={loading}
              style={{
                backgroundColor: '#DC2626',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              Test Connection
            </button>
            
            <button
              onClick={() => {
                setCustomerData([]);
                setInsights({});
                fetchCustomerData();
              }}
              style={{
                backgroundColor: '#6B7280',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Reset Data
            </button>
          </div>
          
          {error && <ErrorDisplay message={error} onRetry={fetchCustomerData} />}
          
          <div style={{
            backgroundColor: '#F3F4F6',
            padding: '1rem',
            borderRadius: '4px',
            marginTop: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              color: '#374151'
            }}>Expected Django API Endpoints:</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, color: '#6B7280' }}>
              <li>• GET /api/transactions/ - Get all transaction data</li>
              <li>• GET /api/transactions/customer-data/ - Get customer analytics</li>
              <li>• GET /api/transactions/retention/ - Get retention metrics</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  const DashboardScreen = () => (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: '#00205B',
          marginBottom: '0.5rem'
        }}>Banking Analytics Dashboard</h1>
        <p style={{ color: '#6B7280', fontSize: '1.1rem' }}>
          Real-time insights into customer behavior and transaction patterns
        </p>
      </div>

      {error && <ErrorDisplay message={error} onRetry={fetchCustomerData} />}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#00205B',
            marginBottom: '1rem'
          }}>Monthly Transaction Volume</h3>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '250px'
            }}>
              <RefreshCw style={{ animation: 'spin 1s linear infinite', color: '#0066CC' }} size={32} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={getChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'transactions' ? `${value} transactions` : value,
                    name === 'transactions' ? 'Transactions' : name
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="transactions" 
                  stroke="#DC2626" 
                  fill="#FEE2E2"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {insights.spikes && insights.spikes.length > 0 && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#DC2626' }}>
              ⚠️ {insights.spikes.length} spike(s) detected: {insights.spikes.map(s => s.month).join(', ')}
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '1.5rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#00205B',
            marginBottom: '1rem'
          }}>Customer Activity Distribution</h3>
          {loading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '250px'
            }}>
              <RefreshCw style={{ animation: 'spin 1s linear infinite', color: '#0066CC' }} size={32} />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'High Activity', value: insights.transactionFrequency?.high || 0, color: '#16A34A' },
                    { name: 'Medium Activity', value: insights.transactionFrequency?.medium || 0, color: '#0066CC' },
                    { name: 'Low Activity', value: insights.transactionFrequency?.low || 0, color: '#F59E0B' },
                    { name: 'Inactive', value: insights.transactionFrequency?.inactive || 0, color: '#DC2626' }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => value > 0 ? `${name}: ${value}` : ''}
                >
                  {[
                    { name: 'High Activity', value: insights.transactionFrequency?.high || 0, color: '#16A34A' },
                    { name: 'Medium Activity', value: insights.transactionFrequency?.medium || 0, color: '#0066CC' },
                    { name: 'Low Activity', value: insights.transactionFrequency?.low || 0, color: '#F59E0B' },
                    { name: 'Inactive', value: insights.transactionFrequency?.inactive || 0, color: '#DC2626' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} customers`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );

  const InsightsScreen = () => (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#00205B',
            marginBottom: '0.5rem'
          }}>Customer Retention Insights</h1>
          <p style={{ color: '#6B7280', fontSize: '1.1rem' }}>
            Analyze customer transaction patterns and retention metrics
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{
              padding: '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '4px',
              backgroundColor: 'white'
            }}
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
            <option value="pie">Pie Chart</option>
          </select>
          
          <button
            onClick={fetchCustomerData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#0066CC',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            <RefreshCw style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} size={18} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && <ErrorDisplay message={error} onRetry={fetchCustomerData} />}

      <div style={{
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        border: '1px solid #E5E7EB',
        marginBottom: '2rem'
      }}>
        <h3 style={{
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#00205B',
          marginBottom: '1rem'
        }}>Customer Transaction Frequency</h3>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '400px'
          }}>
            <RefreshCw style={{ animation: 'spin 1s linear infinite', color: '#0066CC' }} size={48} />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'bar' && (
              <BarChart data={getCustomerRetentionData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalTransactions" fill="#DC2626" name="Total Transactions" />
                <Bar dataKey="avgMonthly" fill="#0066CC" name="Avg Monthly" />
              </BarChart>
            )}
            
            {chartType === 'line' && (
              <LineChart data={getCustomerRetentionData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="totalTransactions" stroke="#DC2626" strokeWidth={3} />
                <Line type="monotone" dataKey="avgMonthly" stroke="#0066CC" strokeWidth={3} />
              </LineChart>
            )}
            
            {chartType === 'area' && (
              <AreaChart data={getCustomerRetentionData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="totalTransactions" stackId="1" stroke="#DC2626" fill="#FEE2E2" />
                <Area type="monotone" dataKey="avgMonthly" stackId="2" stroke="#0066CC" fill="#DBEAFE" />
              </AreaChart>
            )}
            
            {chartType === 'pie' && (
              <PieChart>
                <Pie
                  data={getCustomerRetentionData().map(item => ({
                    name: item.name,
                    value: item.totalTransactions
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {getCustomerRetentionData().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  const renderScreen = () => {
    switch (currentScreen) {
      case 'insights':
        return <InsightsScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <DashboardScreen />;
    }
  };

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh' }}>
      <Navigation />
      {renderScreen()}
    </div>
  );
};

export default BankingDashboard;