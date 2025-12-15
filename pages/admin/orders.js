import { useState, useEffect } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [timeframe, setTimeframe] = useState('7d');

  // Generate sample orders data
  const generateOrders = () => {
    const statuses = ['completed', 'pending', 'processing', 'cancelled', 'refunded'];
    const products = ['Basic Plan', 'Pro Plan', 'Enterprise Plan', 'Add-on Service'];
    
    return Array.from({ length: 100 }, (_, i) => {
      const orderDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const amount = Math.floor(Math.random() * 500 + 50);
      
      return {
        id: `ORD-${String(i + 1).padStart(4, '0')}`,
        customer: `Customer ${i + 1}`,
        email: `customer${i + 1}@example.com`,
        product,
        status,
        amount,
        date: orderDate.toLocaleDateString(),
        time: orderDate.toLocaleTimeString(),
        paymentMethod: Math.random() > 0.5 ? 'Credit Card' : 'PayPal'
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Generate chart data
  const generateOrdersChart = () => {
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        orders: Math.floor(Math.random() * 25 + 5),
        revenue: Math.floor(Math.random() * 5000 + 1000),
        completed: Math.floor(Math.random() * 20 + 3),
        pending: Math.floor(Math.random() * 8 + 1)
      });
    }
    return data;
  };

  useEffect(() => {
    setTimeout(() => {
      setOrders(generateOrders());
      setLoading(false);
    }, 800);
  }, []);

  const chartData = generateOrdersChart();
  
  const filteredOrders = orders.filter(order => 
    filterStatus === 'all' || order.status === filterStatus
  );

  const getStatusBadge = (status) => {
    const classes = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return `inline-flex px-2 py-1 text-xs font-semibold rounded-full ${classes[status]}`;
  };

  const totalRevenue = orders.reduce((sum, order) => sum + order.amount, 0);
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const avgOrderValue = totalRevenue / orders.length || 0;

  if (loading) {
    return (
      <AdminLayout title="Orders">
        <div className="dashboard-loading">
          <div className="loading-container">
            <div className="loading-spinner-large"></div>
            <p className="text-subdued">Loading orders...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Orders">
      <div className="shopify-dashboard">
        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-title">
              <h1 className="text-display-medium">Orders</h1>
              <p className="text-subdued">
                Track and manage all customer orders and transactions
              </p>
            </div>
            <div className="header-actions">
              <select 
                value={timeframe} 
                onChange={(e) => setTimeframe(e.target.value)}
                className="timeframe-select"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
              </select>
              <button className="btn btn-primary">
                Export Orders
              </button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="stats-overview">
          <div className="stats-grid-shopify">
            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Total Orders</span>
              </div>
              <div className="stat-value">{orders.length}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 20 + 8)}% vs last period</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Total Revenue</span>
              </div>
              <div className="stat-value">${totalRevenue.toLocaleString()}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 25 + 15)}% vs last period</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Completed Orders</span>
              </div>
              <div className="stat-value">{completedOrders}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>{Math.round((completedOrders / orders.length) * 100)}% completion rate</span>
              </div>
            </div>

            <div className="stat-card-shopify">
              <div className="stat-header">
                <span className="stat-label">Average Order Value</span>
              </div>
              <div className="stat-value">${avgOrderValue.toFixed(0)}</div>
              <div className="stat-trend positive">
                <svg viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span>+{Math.floor(Math.random() * 12 + 5)}% vs last period</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section">
          <div className="charts-grid">
            {/* Orders Trend */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Orders Trend</h3>
                <div className="chart-actions">
                  <button className="btn btn-secondary btn-sm">View Details</button>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-large)',
                        color: 'var(--color-text)',
                        boxShadow: 'var(--shadow-popover)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      stroke="var(--color-primary)" 
                      strokeWidth={3}
                      dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }}
                      animationDuration={2000}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Trend */}
            <div className="chart-card">
              <div className="chart-header">
                <h3 className="text-heading">Revenue Trend</h3>
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="var(--color-text-subdued)"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-large)',
                        color: 'var(--color-text)'
                      }}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="var(--color-accent-blue)"
                      radius={[4, 4, 0, 0]}
                      animationDuration={1500}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="chart-card">
          <div className="chart-header">
            <h3 className="text-heading">Recent Orders</h3>
            <div className="flex gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="timeframe-select"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>
          
          <div className="chart-container">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Order ID</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Customer</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Product</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Status</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Amount</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Date</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Payment</th>
                    <th className="text-left py-4 px-4 font-medium text-subdued text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.slice(0, 20).map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-4">
                        <span className="font-mono text-sm font-medium text-blue-600">{order.id}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{order.customer}</div>
                          <div className="text-sm text-gray-500">{order.email}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-900">{order.product}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={getStatusBadge(order.status)}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm font-semibold text-gray-900">${order.amount}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-sm text-gray-900">{order.date}</div>
                          <div className="text-xs text-gray-500">{order.time}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-500">{order.paymentMethod}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                          <button className="text-green-600 hover:text-green-800 text-sm">Process</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500">No orders found matching your criteria.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}