import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusCircle, Wallet, TrendingDown, TrendingUp, PieChart as PieIcon, Activity, Trash2, Bell, AlertTriangle, Pencil, X, Download, LogOut, Lock, Mail, User } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';

function App() {
  // ==========================================
  // 🔐 AUTHENTICATION STATES
  // ==========================================
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [isLoginView, setIsLoginView] = useState(true);
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // ==========================================
  // 💰 DASHBOARD STATES
  // ==========================================
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Expense');
  const [category, setCategory] = useState('Food');
  const [customCategory, setCustomCategory] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState(50000);
  const [showNotification, setShowNotification] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // ==========================================
  // ⚙️ API FUNCTIONS
  // ==========================================
  
  // Auth Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = isLoginView ? '/api/login' : '/api/register';
      const res = await axios.post(`http://localhost:5000${endpoint}`, authForm);
      
      if (isLoginView) {
        // Save token & user data to browser storage
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
      } else {
        alert("Account Created! You can now log in.");
        setIsLoginView(true);
      }
    } catch (err) {
      setAuthError(err.response?.data?.error || "Something went wrong!");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setExpenses([]);
  };

  // Expense Handlers
  const fetchExpenses = async () => {
    if (!user) return;
    try {
      // Fetch only THIS user's data
      const res = await axios.get(`http://localhost:5000/api/expenses?user_id=${user.id}`);
      setExpenses(res.data);
    } catch (err) {
      console.error("Fetch error", err);
    }
  };

  useEffect(() => {
    if (token && user) {
      fetchExpenses();
    }
  }, [token, user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!amount) return;

    const finalCategory = category === 'Others' ? (customCategory || 'Others') : category;

    try {
      if (editingId) {
        await axios.put(`http://localhost:5000/api/expenses/${editingId}`, {
          amount: parseFloat(amount),
          category: finalCategory,
          type: type 
        });
        setEditingId(null); 
      } else {
        await axios.post('http://localhost:5000/api/expenses', {
          user_id: user.id, // Connected to logged-in user!
          amount: parseFloat(amount),
          category: finalCategory,
          description: "Personal",
          type: type 
        });
      }
      
      setAmount('');
      setCategory(type === 'Expense' ? 'Food' : 'Salary'); 
      setCustomCategory(''); 
      fetchExpenses(); 
    } catch (err) {
      console.error("Save panna mudila", err);
    }
  };

  const deleteExpense = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        await axios.delete(`http://localhost:5000/api/expenses/${id}`);
        fetchExpenses(); 
      } catch (err) {
        console.error("Delete panna mudila", err);
      }
    }
  };

  const exportToExcel = () => {
    const excelData = expenses.map(exp => ({
      Date: new Date(exp.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
      Type: exp.type || 'Expense',
      Category: exp.category,
      Amount: parseFloat(exp.amount)
    }));
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "My Transactions");
    XLSX.writeFile(workbook, "AuraFinance_Report.xlsx");
  };

  const startEdit = (exp) => {
    setEditingId(exp.id);
    setAmount(exp.amount);
    setType(exp.type || 'Expense');
    const standardCats = (exp.type || 'Expense') === 'Expense' ? expenseCategories : incomeCategories;
    if (standardCats.includes(exp.category)) {
      setCategory(exp.category);
      setCustomCategory('');
    } else {
      setCategory('Others');
      setCustomCategory(exp.category);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAmount('');
    setCategory(type === 'Expense' ? 'Food' : 'Salary');
    setCustomCategory('');
  };

  // ==========================================
  // 🧮 CALCULATIONS & DATA SETUP
  // ==========================================
  const totalIncome = expenses.filter(e => e.type === 'Income').reduce((s, e) => s + parseFloat(e.amount), 0);
  const totalExpense = expenses.filter(e => e.type === 'Expense' || !e.type).reduce((s, e) => s + parseFloat(e.amount), 0);
  const currentBalance = totalIncome - totalExpense;
  const remainingBudget = monthlyBudget - totalExpense;
  const isOverBudget = remainingBudget < 0; 
  const overspentAmount = Math.abs(remainingBudget); 
  const isNearBudget = remainingBudget >= 0 && remainingBudget <= (monthlyBudget * 0.25); 

  const chartData = expenses.filter(e => e.type === 'Expense' || !e.type).reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += parseFloat(curr.amount);
    } else {
      acc.push({ name: curr.category, value: parseFloat(curr.amount) });
    }
    return acc;
  }, []);

  const COLORS = ['#0ea5e9', '#22c55e', '#f97316', '#a855f7', '#ec4899', '#eab308', '#14b8a6'];
  const expenseCategories = ["Food", "Rent", "Shopping", "Travel", "Investments", "Others"];
  const incomeCategories = ["Salary", "Freelance", "Bonus", "Investments Return", "Others"];

  // ==========================================
  // 🎨 UI RENDER: AUTHENTICATION SCREEN
  // ==========================================
  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-slate-800 flex items-center justify-center tracking-tight mb-2">
              <Activity className="mr-2 text-sky-500 w-10 h-10" /> 
              Aura<span className="text-sky-600 ml-1">Finance</span>
            </h1>
            <p className="text-slate-500 font-medium">
              {isLoginView ? 'Welcome back! Please login.' : 'Create an account to start tracking.'}
            </p>
          </div>

          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-bold text-center mb-6 border border-red-200">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLoginView && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="text" placeholder="Full Name" required
                  className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-200 outline-none transition"
                  value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="email" placeholder="Email Address" required
                className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-200 outline-none transition"
                value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="password" placeholder="Password" required
                className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-200 outline-none transition"
                value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})}
              />
            </div>

            <button type="submit" className="w-full bg-sky-600 text-white py-4 rounded-xl text-lg font-bold shadow-lg hover:bg-sky-700 hover:shadow-sky-200 transform active:scale-95 transition-all">
              {isLoginView ? 'Log In' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center text-slate-500">
            {isLoginView ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => { setIsLoginView(!isLoginView); setAuthError(''); setAuthForm({name:'', email:'', password:''})}} 
              className="text-sky-600 font-bold hover:underline"
            >
              {isLoginView ? 'Sign Up' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🎨 UI RENDER: MAIN DASHBOARD
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in duration-500">
      
      {/* HEADER WITH LOGOUT */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-4 border-b border-slate-200 relative gap-4">
        <h1 className="text-3xl font-extrabold text-slate-800 flex items-center tracking-tight">
          <Activity className="mr-3 text-sky-500 w-8 h-8" /> 
          Aura<span className="text-sky-600 ml-1">Finance</span>
        </h1>
        
        <div className="flex items-center gap-4">
          {/* Welcome User Badge */}
          <div className="bg-sky-100 text-sky-800 px-4 py-2 rounded-full font-bold text-sm hidden sm:block">
            Hi, {user.name} 👋
          </div>

          {(isOverBudget || isNearBudget) && (
            <button 
              onClick={() => setShowNotification(!showNotification)}
              className="relative p-2 rounded-full bg-white border border-slate-200 shadow-sm hover:bg-slate-100 transition-all"
            >
              {isOverBudget ? <AlertTriangle className="w-6 h-6 text-red-500 animate-pulse" /> : <Bell className="w-6 h-6 text-orange-500 animate-bounce" />}
              <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          )}

          {/* Logout Button */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-slate-200 text-slate-700 px-4 py-2 rounded-full font-bold text-sm hover:bg-slate-300 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>

          {/* Notifications Dropdown */}
          {showNotification && (isOverBudget || isNearBudget) && (
            <div className="absolute right-0 top-14 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 z-50 animate-in fade-in slide-in-from-top-4">
              {isOverBudget ? (
                <div className="text-red-700">
                  <div className="flex items-center gap-2 border-b border-red-100 pb-2 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    <p className="font-bold text-lg">Over Budget!</p>
                  </div>
                  <p className="text-sm">You crossed your budget by <span className="font-extrabold text-lg">₹{overspentAmount.toLocaleString()}</span>.</p>
                </div>
              ) : (
                <div className="text-orange-800">
                  <div className="flex items-center gap-2 border-b border-orange-100 pb-2 mb-3">
                    <Bell className="w-5 h-5" />
                    <p className="font-bold text-lg">Budget Reminder</p>
                  </div>
                  <p className="text-sm">Only <span className="font-extrabold text-lg">₹{remainingBudget.toLocaleString()}</span> is remaining.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* COMPACT TOP STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-4 rounded-2xl text-white shadow-md">
          <p className="text-xs font-semibold opacity-80 mb-1 flex justify-between items-center">
            TOTAL BALANCE <Wallet className="w-4 h-4"/>
          </p>
          <h3 className="text-2xl font-extrabold tracking-tight">₹{currentBalance.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center">
            <TrendingUp className="w-4 h-4 text-emerald-500 mr-1"/> TOTAL INCOME
          </p>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">₹{totalIncome.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center">
            <TrendingDown className="w-4 h-4 text-red-500 mr-1"/> TOTAL EXPENSE
          </p>
          <h3 className="text-2xl font-bold text-slate-800 tracking-tight">₹{totalExpense.toLocaleString()}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Add/Edit Form */}
        <div className="space-y-8 lg:col-span-1">
          <div className={`p-7 rounded-3xl shadow-lg border transition-all duration-300 ${editingId ? 'bg-amber-50 border-amber-200 shadow-amber-100' : 'bg-white border-slate-100'}`}>
            <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center justify-between">
              <span className="flex items-center">
                {editingId ? <Pencil className="mr-3 text-amber-500 w-6 h-6" /> : <PlusCircle className="mr-3 text-emerald-500 w-6 h-6" />}
                {editingId ? 'Edit Transaction' : 'Add Transaction'}
              </span>
              {editingId && (
                <button onClick={cancelEdit} className="text-slate-400 hover:text-slate-600" title="Cancel Edit">
                  <X className="w-5 h-5" />
                </button>
              )}
            </h2>
            
            <form onSubmit={handleSave} className="space-y-5">
              <div className="flex bg-slate-100 p-1 rounded-xl opacity-90">
                <button type="button" onClick={() => {setType('Expense'); setCategory('Food');}} className={`flex-1 py-2 font-bold rounded-lg transition ${type === 'Expense' ? 'bg-white text-red-500 shadow-sm' : 'text-slate-400'}`}>Expense</button>
                <button type="button" onClick={() => {setType('Income'); setCategory('Salary');}} className={`flex-1 py-2 font-bold rounded-lg transition ${type === 'Income' ? 'bg-white text-emerald-500 shadow-sm' : 'text-slate-400'}`}>Income</button>
              </div>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input 
                  type="number" placeholder="Enter Amount" 
                  className="w-full p-4 pl-10 text-lg bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-sky-200 outline-none"
                  value={amount} onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              
              <select className="w-full p-4 text-base bg-slate-50 border border-slate-200 rounded-xl outline-none" value={category} onChange={(e) => setCategory(e.target.value)}>
                {(type === 'Expense' ? expenseCategories : incomeCategories).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {category === 'Others' && (
                <input type="text" placeholder="Type category..." required
                  className="w-full p-4 text-base bg-slate-50 border border-orange-200 rounded-xl"
                  value={customCategory} onChange={(e) => setCustomCategory(e.target.value)}
                />
              )}

              <button type="submit" className={`w-full text-white py-4 rounded-xl text-lg font-bold shadow-lg transform active:scale-95 transition-all ${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : type === 'Income' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-sky-600 hover:bg-sky-700 shadow-sky-200'}`}>
                {editingId ? 'Save Changes' : `Add ${type}`}
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <span className="text-sm font-bold text-slate-500 block mb-2">Monthly Expense Target:</span>
             <div className="flex items-center bg-slate-50 rounded-lg px-4 py-2 border border-slate-200">
               <span className="mr-1 font-bold text-slate-400">₹</span>
               <input type="number" value={monthlyBudget} onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)} className="bg-transparent text-slate-800 w-full font-extrabold text-xl outline-none" />
             </div>
          </div>
        </div>

        {/* MIDDLE: SPENDING ANALYSIS */}
        <div className="bg-white p-7 rounded-3xl shadow-lg border border-slate-100 md:col-span-2 lg:col-span-1 flex flex-col">
          <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center">
            <PieIcon className="mr-3 text-purple-500 w-6 h-6" /> Expense Analysis
          </h2>
          {chartData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">Add expenses to see analysis</div>
          ) : (
            <>
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius: '12px'}} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 pt-4 border-t border-slate-100 max-h-[150px] overflow-y-auto">
                {chartData.map((item, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="flex items-center text-slate-600 font-medium truncate pr-2">
                      <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{backgroundColor: COLORS[i % COLORS.length]}}></div> 
                      {item.name}
                    </span>
                    <span className="font-bold text-slate-900">₹{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* RIGHT: RECENT HISTORY */}
        <div className="bg-white p-7 rounded-3xl shadow-lg border border-slate-100 lg:col-span-1 max-h-[600px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center">
              <Activity className="mr-3 text-sky-500 w-6 h-6" /> Recent History
            </h2>
            <button onClick={exportToExcel} className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-200 transition-colors" title="Download as Excel">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>

          <div className="overflow-y-auto flex-1 pr-2">
            {expenses.length === 0 ? (
              <p className="text-center text-slate-400 py-12">No records found.</p>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center py-4 border-b border-slate-100 last:border-none group hover:bg-slate-50 px-2 rounded-xl transition">
                  <div className="flex-1 truncate pr-4">
                    <p className="font-semibold text-slate-800 truncate">{exp.category}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(exp.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <p className={`font-extrabold text-lg mr-2 whitespace-nowrap ${exp.type === 'Income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {exp.type === 'Income' ? '+' : '-'}₹{parseFloat(exp.amount).toLocaleString()}
                    </p>
                    <button onClick={() => startEdit(exp)} className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-full transition-all" title="Edit Record"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteExpense(exp.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all" title="Delete Record"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;