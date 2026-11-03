import React, { useState, useEffect } from 'react';
import { apiRequest, setAuthToken, clearAuthToken } from './services/api.ts';
import { 
  Server, 
  LifeBuoy, 
  Receipt, 
  ShieldCheck, 
  Users, 
  LogOut, 
  PlusCircle, 
  Clock,
  Globe,
  Search,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  roleId: number;
}

export function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<'domains' | 'hosting' | 'tickets' | 'invoices' | 'reseller' | 'admin'>('domains');
  const [domains, setDomains] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any | null>(null);
  const [adminTlds, setAdminTlds] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [upstreamStatus, setUpstreamStatus] = useState<any | null>(null);
  const [resellerClients, setResellerClients] = useState<any[]>([]);
  const [resellerPricing, setResellerPricing] = useState<any[]>([]);
  const [resellerWallet, setResellerWallet] = useState<any | null>(null);
  const [resellerTransactions, setResellerTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Transfer-In Modal / State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferDomainName, setTransferDomainName] = useState('');
  const [transferAuthCode, setTransferAuthCode] = useState('');

  // Add Funds Modal / State (Reseller)
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');

  // Add Sub-Client Modal / State (Reseller)
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');

  // New TLD modal/form state (Admin only)
  const [newTldName, setNewTldName] = useState('');
  const [newTldPrice, setNewTldPrice] = useState('');

  // Hosting provisioning state
  const [provPlatform, setProvPlatform] = useState<'plesk' | 'cpanel'>('plesk');
  const [provDomain, setProvDomain] = useState('');
  const [provUsername, setProvUsername] = useState('');
  const [provPassword, setProvPassword] = useState('');
  const [provPlan, setProvPlan] = useState('Standard Hosting');
  const [provisioningLoading, setProvisioningLoading] = useState(false);

  // Proxmox VPS quick action state
  const [vpsId, setVpsId] = useState('');
  const [vpsAction, setVpsAction] = useState<'start' | 'stop' | 'reboot'>('start');

  // Domain search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);

  // Auth Form State
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState('');

  // New ticket state
  const [newSubject, setNewSubject] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadTabData(activeTab);
    }
  }, [user, activeTab]);

  async function loadTabData(tab: string) {
    setLoading(true);
    try {
      if (tab === 'domains') {
        const res = await apiRequest('/domains');
        setDomains(res.domains || []);
      } else if (tab === 'tickets') {
        const res = await apiRequest('/tickets');
        setTickets(res.tickets || []);
      } else if (tab === 'invoices') {
        const res = await apiRequest('/billing/invoices');
        setInvoices(res.invoices || []);
      } else if (tab === 'reseller' && (user?.roleId === 3 || user?.roleId === 1)) {
        const [cRes, pRes, wRes] = await Promise.all([
          apiRequest('/reseller/clients').catch(() => ({ clients: [] })),
          apiRequest('/reseller/pricing').catch(() => ({ pricing: [] })),
          apiRequest('/reseller/wallet').catch(() => ({ wallet: null, transactions: [] })),
        ]);
        setResellerClients(cRes.clients || []);
        setResellerPricing(pRes.pricing || []);
        setResellerWallet(wRes.wallet || null);
        setResellerTransactions(wRes.transactions || []);
      } else if (tab === 'admin' && user?.roleId === 1) {
        const [statsRes, tldsRes, usersRes, upRes] = await Promise.all([
          apiRequest('/admin/overview'),
          apiRequest('/admin/tlds'),
          apiRequest('/admin/users'),
          apiRequest('/admin/upstream/status').catch(() => ({ status: null })),
        ]);
        setAdminStats(statsRes.stats || null);
        setAdminTlds(tldsRes.tlds || []);
        setAdminUsers(usersRes.users || []);
        setUpstreamStatus(upRes.status || null);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDomainSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await apiRequest(`/domains/check?domain=${encodeURIComponent(searchQuery)}`);
      setSearchResult(res);
    } catch (err: any) {
      alert(err.message || 'Domain check failed');
    } finally {
      setSearching(false);
    }
  }

  async function handleRegisterDomain(domainName: string) {
    try {
      await apiRequest('/domains/register', {
        method: 'POST',
        body: JSON.stringify({ name: domainName, domainYear: 1 }),
      });
      alert(`Domain ${domainName} registered successfully!`);
      setSearchResult(null);
      setSearchQuery('');
      loadTabData('domains');
    } catch (err: any) {
      alert(err.message || 'Registration failed');
    }
  }

  async function handleTransferDomain(e: React.FormEvent) {
    e.preventDefault();
    if (!transferDomainName || !transferAuthCode) return;
    try {
      await apiRequest('/domains/transfer', {
        method: 'POST',
        body: JSON.stringify({ name: transferDomainName, authCode: transferAuthCode, domainYear: 1 }),
      });
      alert(`Transfer request initiated for ${transferDomainName} with EPP Auth code!`);
      setShowTransferModal(false);
      setTransferDomainName('');
      setTransferAuthCode('');
      loadTabData('domains');
    } catch (err: any) {
      alert(err.message || 'Transfer failed');
    }
  }

  async function handleRenewDomain(domainId: number, domainName: string) {
    if (!confirm(`Renew ${domainName} for 1 additional year?`)) return;
    try {
      const res = await apiRequest(`/domains/${domainId}/renew`, {
        method: 'POST',
        body: JSON.stringify({ additionalYears: 1 }),
      });
      alert(res.message);
      loadTabData('domains');
    } catch (err: any) {
      alert(err.message || 'Renewal failed');
    }
  }

  async function handleAddFunds(e: React.FormEvent) {
    e.preventDefault();
    if (!fundAmount) return;
    try {
      const res = await apiRequest('/reseller/wallet/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(fundAmount) }),
      });
      alert(res.message);
      setShowAddFundsModal(false);
      setFundAmount('');
      loadTabData('reseller');
    } catch (err: any) {
      alert(err.message || 'Deposit failed');
    }
  }

  async function handleCreateSubClient(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName || !clientEmail || !clientPassword) return;
    try {
      await apiRequest('/reseller/clients', {
        method: 'POST',
        body: JSON.stringify({ name: clientName, email: clientEmail, password: clientPassword }),
      });
      alert(`Sub-client account created successfully for ${clientName}!`);
      setShowAddClientModal(false);
      setClientName('');
      setClientEmail('');
      setClientPassword('');
      loadTabData('reseller');
    } catch (err: any) {
      alert(err.message || 'Failed to create client');
    }
  }

  async function handleProvisionHosting(e: React.FormEvent) {
    e.preventDefault();
    if (!provDomain || !provUsername) return;
    setProvisioningLoading(true);
    try {
      await apiRequest('/provisioning/hosting', {
        method: 'POST',
        body: JSON.stringify({
          platform: provPlatform,
          domain: provDomain,
          username: provUsername,
          password: provPassword || 'SecurePass#2026',
          plan: provPlan,
        }),
      });
      alert(`Hosting account on ${provPlatform.toUpperCase()} provisioned successfully for ${provDomain}!`);
      setProvDomain('');
      setProvUsername('');
      setProvPassword('');
    } catch (err: any) {
      alert(err.message || 'Provisioning failed');
    } finally {
      setProvisioningLoading(false);
    }
  }

  async function handleVpsPower(e: React.FormEvent) {
    e.preventDefault();
    if (!vpsId) return;
    try {
      await apiRequest(`/provisioning/vps/${vpsId}/power`, {
        method: 'POST',
        body: JSON.stringify({ action: vpsAction }),
      });
      alert(`Proxmox VPS (${vpsId}) ${vpsAction.toUpperCase()} command issued successfully!`);
    } catch (err: any) {
      alert(err.message || 'Power command failed');
    }
  }

  async function handleAddOrUpdateTLD(e: React.FormEvent) {
    e.preventDefault();
    if (!newTldName || !newTldPrice) return;
    try {
      await apiRequest('/admin/tlds', {
        method: 'POST',
        body: JSON.stringify({ tld: newTldName, priceINR: Number(newTldPrice) }),
      });
      alert(`TLD ${newTldName} pricing saved successfully!`);
      setNewTldName('');
      setNewTldPrice('');
      loadTabData('admin');
    } catch (err: any) {
      alert(err.message || 'Failed to save TLD');
    }
  }

  async function handleDeleteTLD(id: number) {
    if (!confirm('Are you sure you want to delete this TLD?')) return;
    try {
      await apiRequest(`/admin/tlds/${id}`, { method: 'DELETE' });
      loadTabData('admin');
    } catch (err: any) {
      alert(err.message || 'Failed to delete TLD');
    }
  }

  async function handleToggleUser(id: number, currentStatus: number) {
    try {
      await apiRequest(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: currentStatus !== 1 }),
      });
      loadTabData('admin');
    } catch (err: any) {
      alert(err.message || 'Failed to update user');
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLogin) {
        const res = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setAuthToken(res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        setUser(res.user);
      } else {
        await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password }),
        });
        setIsLogin(true);
        alert('Registration complete. Please sign in.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    }
  }

  function handleLogout() {
    clearAuthToken();
    setUser(null);
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!newSubject || !newDesc) return;
    try {
      await apiRequest('/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject: newSubject, description: newDesc, priority: 2 }),
      });
      setShowNewTicketModal(false);
      setNewSubject('');
      setNewDesc('');
      loadTabData('tickets');
    } catch (err: any) {
      alert(err.message || 'Failed to submit ticket');
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex items-center space-x-3 mb-6">
            <Server className="w-8 h-8 text-sky-600" />
            <h1 className="text-2xl font-bold text-slate-800">CloudPortal</h1>
          </div>
          <h2 className="text-xl font-semibold mb-2">{isLogin ? 'Sign In to Your Account' : 'Register New Account'}</h2>
          <p className="text-sm text-slate-500 mb-6">Access your cloud hosting, billing, and support</p>

          {authError && (
            <div className="p-3 mb-4 bg-rose-50 text-rose-700 text-sm rounded-lg border border-rose-200">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sky-600 hover:underline font-medium"
            >
              {isLogin ? 'Register now' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <Server className="w-7 h-7 text-sky-400" />
          <span className="font-bold text-lg tracking-wide">CloudPortal</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('domains')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'domains' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Globe className="w-5 h-5" />
            <span>Domains & DNS</span>
          </button>
          <button
            onClick={() => setActiveTab('hosting')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'hosting' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Server className="w-5 h-5" />
            <span>Cloud & Hosting</span>
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'tickets' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <LifeBuoy className="w-5 h-5" />
            <span>Support Tickets</span>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === 'invoices' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-5 h-5" />
            <span>Billing & Invoices</span>
          </button>
          {(user.roleId === 3 || user.roleId === 1) && (
            <button
              onClick={() => setActiveTab('reseller')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'reseller' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Reseller Portal</span>
            </button>
          )}
          {user.roleId === 1 && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeTab === 'admin' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Admin Management</span>
            </button>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate text-white">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-slate-400 hover:text-white transition p-1.5 rounded"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'domains' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Domain Portfolio & Search</h1>
                <p className="text-slate-500 text-sm">Register new domains, transfer in, and manage authoritative nameservers</p>
              </div>
              <button
                onClick={() => setShowTransferModal(true)}
                className="flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <span>Transfer Domain In (EPP)</span>
              </button>
            </div>

            {/* Domain Search Box */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-8">
              <form onSubmit={handleDomainSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search for your new domain (e.g. mynewbrand.com)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg transition"
                >
                  {searching ? 'Checking...' : 'Check Availability'}
                </button>
              </form>

              {searchResult && (
                <div className="mt-4 p-4 rounded-lg border bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {searchResult.available ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-rose-500" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-800">{searchResult.domain}</p>
                      <p className="text-xs text-slate-500">
                        {searchResult.available
                          ? `Available! ${searchResult.currency} ${searchResult.pricePerYear}/yr`
                          : 'Sorry, this domain is already registered.'}
                      </p>
                    </div>
                  </div>
                  {searchResult.available && (
                    <button
                      onClick={() => handleRegisterDomain(searchResult.domain)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg"
                    >
                      Register Now
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Domain List */}
            <h2 className="text-lg font-bold text-slate-800 mb-3">Your Active Domains</h2>
            {loading ? (
              <p className="text-slate-500 text-sm">Loading domains...</p>
            ) : domains.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-700">No domains registered yet</h3>
                <p className="text-sm text-slate-500">Use the search box above to register your first domain.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y">
                {domains.map((dom) => (
                  <div key={dom.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-800">{dom.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${dom.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {dom.status ? 'Active' : 'Expired'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Expiry Date: {dom.expiryDate} • Registration Term: {dom.domainYear} yr(s)</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleRenewDomain(dom.id, dom.name)}
                        className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded text-xs font-medium"
                      >
                        Renew (+1 Yr)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'hosting' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800">Cloud & Server Provisioning</h1>
              <p className="text-slate-500 text-sm">Automated deployment for Plesk, cPanel, and Proxmox VE</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Web Hosting Provisioning Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <Server className="w-6 h-6 text-sky-600" />
                  <h2 className="text-lg font-bold text-slate-800">Provision Web Hosting</h2>
                </div>
                <form onSubmit={handleProvisionHosting} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Control Panel</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="platform"
                          checked={provPlatform === 'plesk'}
                          onChange={() => setProvPlatform('plesk')}
                        />
                        <span>Plesk Obsidian</span>
                      </label>
                      <label className="flex items-center space-x-2 text-sm text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="platform"
                          checked={provPlatform === 'cpanel'}
                          onChange={() => setProvPlatform('cpanel')}
                        />
                        <span>cPanel / WHM</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Domain Name</label>
                    <input
                      type="text"
                      required
                      placeholder="clientdomain.com"
                      value={provDomain}
                      onChange={(e) => setProvDomain(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">FTP / Panel Username</label>
                      <input
                        type="text"
                        required
                        placeholder="clientuser"
                        value={provUsername}
                        onChange={(e) => setProvUsername(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={provPassword}
                        onChange={(e) => setProvPassword(e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Package Plan</label>
                    <select
                      value={provPlan}
                      onChange={(e) => setProvPlan(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                    >
                      <option value="Standard Hosting">Standard Shared Hosting (10GB)</option>
                      <option value="Business Hosting">Business WordPress Hosting (50GB)</option>
                      <option value="Enterprise Hosting">Enterprise Pro Plan (Unlimited)</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={provisioningLoading}
                    className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-lg text-sm transition"
                  >
                    {provisioningLoading ? 'Provisioning Account...' : 'Deploy Hosting Account'}
                  </button>
                </form>
              </div>

              {/* Proxmox VPS Management Card */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <ShieldCheck className="w-6 h-6 text-indigo-600" />
                  <h2 className="text-lg font-bold text-slate-800">Proxmox VE VPS Control</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  Direct hardware-level virtualization hypervisor control for client instances.
                </p>
                <form onSubmit={handleVpsPower} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Virtual Machine ID (VMID)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 101"
                      value={vpsId}
                      onChange={(e) => setVpsId(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Power Action</label>
                    <select
                      value={vpsAction}
                      onChange={(e) => setVpsAction(e.target.value as any)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                    >
                      <option value="start">Power On (Start)</option>
                      <option value="reboot">Graceful Reboot</option>
                      <option value="stop">Force Stop</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition"
                  >
                    Send Hypervisor Command
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tickets' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Support Tickets</h1>
                <p className="text-slate-500 text-sm">Manage open tickets and communications</p>
              </div>
              <button
                onClick={() => setShowNewTicketModal(true)}
                className="flex items-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Open New Ticket</span>
              </button>
            </div>

            {loading ? (
              <p className="text-slate-500 text-sm">Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-700">No support tickets found</h3>
                <p className="text-sm text-slate-500">Need help? Open a new ticket anytime.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y">
                {tickets.map((t) => (
                  <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-800">{t.subject}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${t.status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {t.status ? 'Open' : 'Closed'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Ref: {t.referenceNo || `#${t.id}`} • Created: {new Date(t.created).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-800">Billing & Invoices</h1>
              <p className="text-slate-500 text-sm">Review your invoices and transaction records</p>
            </div>

            {loading ? (
              <p className="text-slate-500 text-sm">Loading invoices...</p>
            ) : invoices.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-700">No invoices yet</h3>
                <p className="text-sm text-slate-500">Invoices will show up here as your services renew.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="p-4">Invoice #</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Due Date</th>
                      <th className="p-4">Currency</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono font-medium">{inv.referenceId || `#${inv.id}`}</td>
                        <td className="p-4">{inv.billDate}</td>
                        <td className="p-4">{inv.dueDate}</td>
                        <td className="p-4">{inv.invoiceCurrency}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                            inv.statusOfInvoice === 'Paid'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {inv.statusOfInvoice}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reseller' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Reseller Dashboard</h1>
                <p className="text-slate-500 text-sm">Manage sub-accounts, pre-paid fund wallet, and client portfolios</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddFundsModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Deposit Funds
                </button>
                <button
                  onClick={() => setShowAddClientModal(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  + Add Client
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 mb-1">Pre-Paid Wallet Balance</p>
                <p className="text-3xl font-bold text-emerald-600">
                  ₹ {resellerWallet?.Balance !== undefined ? resellerWallet.Balance.toLocaleString() : '0'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Currency: {resellerWallet?.Currency || 'INR'}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 mb-1">Managed Sub-Clients</p>
                <p className="text-3xl font-bold text-slate-800">{resellerClients.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-sm font-medium text-slate-500 mb-1">Active Markup Rules</p>
                <p className="text-3xl font-bold text-indigo-600">{resellerPricing.length}</p>
              </div>
            </div>

            {/* Wallet Ledger */}
            {resellerTransactions && resellerTransactions.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                <div className="p-4 border-b bg-slate-50">
                  <h3 className="font-semibold text-slate-800">Wallet Deduction & Deposit History</h3>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Description</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {resellerTransactions.map((tx) => (
                      <tr key={tx.Id} className="hover:bg-slate-50">
                        <td className="p-3 text-xs text-slate-500">{new Date(tx.Created).toLocaleDateString()}</td>
                        <td className="p-3 font-medium">{tx.Description}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                            tx.Type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {tx.Type}
                          </span>
                        </td>
                        <td className="p-3 font-semibold">₹ {tx.Amount}</td>
                        <td className="p-3 text-slate-500">₹ {tx.BalanceAfter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50">
                <h3 className="font-semibold text-slate-800">Client Portfolio</h3>
              </div>
              {resellerClients.length === 0 ? (
                <p className="p-6 text-sm text-slate-500 text-center">No sub-clients registered under this account yet.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50 text-slate-600">
                    <tr>
                      <th className="p-3">Client Name</th>
                      <th className="p-3">Email</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Country</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {resellerClients.map((c) => (
                      <tr key={c.Id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium">{c.Name}</td>
                        <td className="p-3">{c.Email}</td>
                        <td className="p-3">{c.Phone || '-'}</td>
                        <td className="p-3">{c.Country || '-'}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'admin' && adminStats && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Admin Master Control Panel</h1>
                <p className="text-slate-500 text-sm">Platform administration, pricing engines, user controls, and system health</p>
              </div>
              {upstreamStatus && (
                <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-xl border shadow-sm">
                  <div className={`w-3 h-3 rounded-full ${upstreamStatus.connected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs font-semibold text-slate-800">W3Infotech Bridge Active</p>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${upstreamStatus.sessionMode === 'live_cookie' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {upstreamStatus.sessionMode === 'live_cookie' ? 'Live Session Sync' : 'Direct API'}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 font-medium">Credit: ₹{upstreamStatus.creditBalance?.toLocaleString()} INR (User: {upstreamStatus.username})</p>
                  </div>
                </div>
              )}
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-sm font-medium">Registered Users</span>
                  <Users className="w-5 h-5 text-sky-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{adminStats.totalUsers}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-sm font-medium">Total Invoices</span>
                  <Receipt className="w-5 h-5 text-indigo-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{adminStats.totalInvoices}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-sm font-medium">Unpaid Invoices</span>
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{adminStats.unpaidInvoices}</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between text-slate-500 mb-2">
                  <span className="text-sm font-medium">Open Support Tickets</span>
                  <LifeBuoy className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-3xl font-bold text-slate-800">{adminStats.openTickets}</p>
              </div>
            </div>

            {/* TLD & Domain Pricing Engine (Admin Only) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Supported TLDs & Price Management</h2>
                  <p className="text-xs text-slate-500">Configure retail prices charged to customers and reseller baselines</p>
                </div>
              </div>

              <form onSubmit={handleAddOrUpdateTLD} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 bg-slate-50 p-4 rounded-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">TLD Extension</label>
                  <input
                    type="text"
                    required
                    placeholder=".com / .org / .ai"
                    value={newTldName}
                    onChange={(e) => setNewTldName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Price (INR)</label>
                  <input
                    type="number"
                    required
                    placeholder="999"
                    value={newTldPrice}
                    onChange={(e) => setNewTldPrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition"
                  >
                    Save / Update TLD
                  </button>
                </div>
              </form>

              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="p-3">TLD</th>
                      <th className="p-3">Retail Price (INR)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {adminTlds.map((tld) => (
                      <tr key={tld.Id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold font-mono text-sky-600">{tld.TLD}</td>
                        <td className="p-3 font-semibold">₹ {tld.PriceINR} / yr</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${tld.Status ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                            {tld.Status ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteTLD(tld.Id)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Platform Users Control */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4">User Accounts & Access Management</h2>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Role</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-700">
                    {adminUsers.map((u) => (
                      <tr key={u.Id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <p className="font-semibold text-slate-800">{u.Name}</p>
                          <p className="text-xs text-slate-500">{u.Email}</p>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            u.RoleId === 1 ? 'bg-purple-100 text-purple-700 font-bold' : u.RoleId === 3 ? 'bg-sky-100 text-sky-700 font-medium' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.RoleId === 1 ? 'Admin' : u.RoleId === 3 ? 'Reseller' : 'Customer'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${u.Status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {u.Status ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {u.RoleId !== 1 && (
                            <button
                              onClick={() => handleToggleUser(u.Id, u.Status)}
                              className={`text-xs px-2.5 py-1 rounded font-medium ${
                                u.Status ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                              }`}
                            >
                              {u.Status ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Upstream W3Infotech Reseller Sub-Customers */}
            {upstreamStatus && upstreamStatus.customers && upstreamStatus.customers.length > 0 && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Upstream W3Infotech Reseller Customers</h2>
                    <p className="text-xs text-slate-500">Live sub-accounts synced directly from upstream reseller account ({upstreamStatus.username})</p>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {upstreamStatus.customers.length} Account(s) Synced
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Reference No</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3 text-center">Domains</th>
                        <th className="p-3 text-right">Registered On</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {upstreamStatus.customers.map((c: any) => (
                        <tr key={c.referenceNo} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-400 font-mono text-xs">{c.slNo}</td>
                          <td className="p-3 font-mono font-semibold text-sky-600 text-xs">{c.referenceNo}</td>
                          <td className="p-3 font-semibold text-slate-800">{c.name}</td>
                          <td className="p-3 text-slate-600">{c.email}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 font-medium text-slate-700">
                              {c.domainsCount}
                            </span>
                          </td>
                          <td className="p-3 text-right text-xs text-slate-500">{c.createdDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Transfer Domain Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Inbound Domain Transfer (EPP)</h3>
              <p className="text-xs text-slate-500 mb-4">Transfer your existing domain to CloudPortal with 1 year renewal included.</p>
              <form onSubmit={handleTransferDomain} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Domain Name</label>
                  <input
                    type="text"
                    required
                    placeholder="mybrand.com"
                    value={transferDomainName}
                    onChange={(e) => setTransferDomainName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">EPP Secret / Auth Code</label>
                  <input
                    type="password"
                    required
                    placeholder="Auth code from losing registrar"
                    value={transferAuthCode}
                    onChange={(e) => setTransferAuthCode(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
                  >
                    Submit Transfer Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deposit Funds Modal */}
        {showAddFundsModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Deposit Funds to Wallet</h3>
              <p className="text-xs text-slate-500 mb-4">Add pre-paid balance to instantly provision domains and servers for clients.</p>
              <form onSubmit={handleAddFunds} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (INR)</label>
                  <input
                    type="number"
                    required
                    min="500"
                    placeholder="e.g. 10000"
                    value={fundAmount}
                    onChange={(e) => setFundAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFundsModal(false)}
                    className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
                  >
                    Confirm Deposit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Sub-Client Modal */}
        {showAddClientModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-2">Onboard New Sub-Client</h3>
              <p className="text-xs text-slate-500 mb-4">Create a customer portal account managed under your reseller agency.</p>
              <form onSubmit={handleCreateSubClient} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Client Full Name / Business</label>
                  <input
                    type="text"
                    required
                    placeholder="Delta Tech Inc"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="client@deltatech.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddClientModal(false)}
                    className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* New Ticket Modal */}
        {showNewTicketModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Open New Support Ticket</h3>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Brief description of the issue"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Details</label>
                  <textarea
                    required
                    rows={4}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Provide details about what you need assistance with..."
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewTicketModal(false)}
                    className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
