/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  setDoc,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { 
  Project, 
  AttendanceRecord, 
  UserProfile, 
  ProgressReport,
  RiskRow,
  RiskDoc
} from './types';
import { 
  Camera, 
  MapPin, 
  ClipboardCheck, 
  HardHat, 
  BarChart3, 
  LogOut, 
  Plus, 
  ChevronRight, 
  CloudSun,
  Package,
  History,
  AlertCircle,
  Search,
  Filter,
  Map as MapIcon,
  Mail,
  Lock,
  User as UserIcon,
  X,
  WifiOff,
  ShieldCheck,
  FileText,
  Save,
  Download,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { saveRiskDocLocal, loadRiskDocsLocal } from './lib/riskEngine';
import * as XLSX from 'xlsx';
import { generateRiskDraft } from './services/aiService';

// Fix for default marker icons in Leaflet using CDN
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// --- Components ---

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg text-brand-text p-6 text-center">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="mb-8"
    >
      <HardHat size={64} className="text-brand-primary" />
    </motion.div>
    <h1 className="text-2xl font-bold mb-2">ConstruxTrack</h1>
    <p className="text-brand-muted">Loading site data and verifying session...</p>
  </div>
);

const AuthScreen = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAppleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        // Profile creation is handled by the useEffect in App main
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const socialLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-brand-bg p-6">
      <div className="w-full max-w-md space-y-8 bg-brand-card p-8 rounded-2xl shadow-xl border border-brand-border">
        <div className="text-center">
          <div className="mx-auto bg-brand-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 border border-brand-primary/20">
            <HardHat size={40} className="text-brand-primary" />
          </div>
          <h1 className="text-3xl font-bold text-brand-text mb-2 tracking-tight">ConstruxTrack</h1>
          <p className="text-brand-muted">Secure Construction Management</p>
        </div>

        {authError && (
          <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center gap-2 text-red-600 text-xs font-medium">
            <AlertCircle size={14} /> {authError}
          </div>
        )}
        
        <form onSubmit={handleAppleAuth} className="space-y-4">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
                <input 
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-primary"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-primary"
                placeholder="email@example.com"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:border-brand-primary"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-brand-sidebar text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegistering ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="relative py-2 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-brand-border"></div></div>
            <span className="relative px-4 bg-brand-card text-[10px] text-brand-muted uppercase font-bold tracking-widest">or continue with</span>
        </div>
        
        <button
          onClick={socialLogin}
          disabled={loading}
          className="w-full py-3 bg-white border border-brand-border text-brand-text font-bold rounded-xl flex items-center justify-center gap-3 hover:bg-brand-bg transition-all transform shadow-sm active:scale-95 disabled:opacity-50"
        >
          <img src="https://www.google.com/favicon.ico" className="w-4 h-4" referrerPolicy="no-referrer" />
          Google Account
        </button>
        
        <div className="pt-2 text-center">
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-brand-primary text-xs font-bold hover:underline"
          >
            {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Register now"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'attendance' | 'progress' | 'history' | 'project-select' | 'map' | 'admin-projects' | 'risk-assessment'>('dashboard');
  const [targetView, setTargetView] = useState<'attendance' | 'progress' | 'risk-assessment'>('attendance');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in-progress' | 'completed' | 'on-hold'>('all');

  // Add Project State
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectLocation, setNewProjectLocation] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auth & Profile Lifecycle
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, 'users', u.uid);
          const docSnap = await getDoc(docRef);
          
          if (!docSnap.exists()) {
            const profile: UserProfile = {
              uid: u.uid,
              email: u.email!,
              displayName: u.displayName || 'Anonymous',
              role: 'contractor',
            };
            await setDoc(docRef, profile);
            setUserProfile(profile);
          } else {
            setUserProfile(docSnap.data() as UserProfile);
          }
        } catch (err) {
          console.error("Profile error:", err);
          setError("Failed to load user profile. Check connection.");
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch Projects
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(pList);
    });
    return unsubscribe;
  }, [user]);

  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || p.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingScreen />;
  if (!user) return <AuthScreen />;

  const handleSignOut = () => signOut(auth);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newProjectLocation) return;
    setIsCreatingProject(true);
    try {
      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        location: newProjectLocation,
        status: 'in-progress',
        createdAt: serverTimestamp(),
        coordinates: { lat: -26.12, lng: 28.10 } // Simulated near Johannesburg for demo
      });
      setNewProjectName('');
      setNewProjectLocation('');
      setView('dashboard');
    } catch (err) {
      setError("Failed to create project.");
    } finally {
      setIsCreatingProject(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-primary/30 overflow-x-hidden pb-24">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between bg-brand-sidebar text-white shadow-lg sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-primary-dark rounded-lg flex items-center justify-center">
            <HardHat size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">ConstruxTrack</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-60">
              {userProfile?.role === 'admin' ? 'Administration' : 'Contractor Console'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleSignOut}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
        >
          <LogOut size={18} className="text-white/80" />
        </button>
      </header>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-sm relative z-40">
          <WifiOff size={14} />
          OFFLINE CACHE ACTIVE - CHANGES SYNC LATER
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-xl mx-auto p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3 text-red-600 shadow-sm">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              {/* User Hero */}
              <div className="bg-gradient-to-br from-brand-primary to-brand-primary-dark rounded-2xl p-6 text-white shadow-xl shadow-brand-primary/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <BarChart3 size={120} />
                </div>
                <p className="text-xs uppercase tracking-widest font-semibold opacity-80 mb-1">Welcome back,</p>
                <h3 className="text-2xl font-bold mb-4">{userProfile?.displayName}</h3>
                <div className="flex items-center gap-4 text-sm opacity-90">
                  <div className="flex items-center gap-1">
                    <CloudSun size={16} /> 24°C Sunny
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin size={16} /> GPS Enabled
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted px-1 flex items-center justify-between">
                  Core Operations
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <MenuButton 
                    icon={<Camera size={22} />} 
                    title="Selfie Attendance" 
                    subtitle="GPS Check-in required"
                    color="text-brand-accent"
                    onClick={() => { setTargetView('attendance'); setView('project-select'); }}
                  />
                  <MenuButton 
                    icon={<BarChart3 size={22} />} 
                    title="Progress Update" 
                    subtitle="Photos & Material logs"
                    color="text-brand-primary"
                    onClick={() => { setTargetView('progress'); setView('project-select'); }}
                  />
                  <MenuButton 
                    icon={<History size={22} />} 
                    title="Historical Logs" 
                    subtitle="View site activity"
                    color="text-indigo-500"
                    onClick={() => setView('history')}
                  />
                  <MenuButton 
                    icon={<ShieldCheck size={22} />} 
                    title="Risk Audit" 
                    subtitle="AI Drafted Assessment"
                    color="text-red-500"
                    onClick={() => { setTargetView('risk-assessment'); setView('project-select'); }}
                  />
                </div>
              </div>

              {/* Active Projects Status */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted">
                    Active Projects
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-brand-muted font-bold opacity-60 uppercase">{filteredProjects.length} found</span>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
                      <input 
                        type="text"
                        placeholder="Search sites..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-brand-border rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-brand-primary shadow-sm"
                      />
                    </div>
                    <div className="relative">
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="appearance-none bg-white border border-brand-border rounded-xl py-2 pl-4 pr-10 text-xs font-bold text-brand-muted focus:outline-none focus:border-brand-primary shadow-sm"
                      >
                        <option value="all">All Status</option>
                        <option value="in-progress">Building</option>
                        <option value="completed">Finished</option>
                        <option value="on-hold">Paused</option>
                      </select>
                      <Filter size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                {filteredProjects.map(project => (
                  <div key={project.id} className="bg-brand-card border border-brand-border rounded-xl p-4 flex items-center justify-between group shadow-sm hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-brand-bg rounded-lg flex items-center justify-center border border-brand-border">
                        <MapPin size={20} className="text-brand-muted" />
                      </div>
                      <div>
                        <h4 className="font-bold text-brand-text text-sm">{project.name}</h4>
                        <p className="text-[10px] text-brand-muted uppercase tracking-wider">{project.location}</p>
                      </div>
                    </div>
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                        project.status === 'in-progress' ? 'bg-blue-50 text-brand-primary' : 'bg-brand-bg text-brand-muted'
                      }`}>
                        {project.status.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
                </div>
                
                {filteredProjects.length === 0 && (
                   <div className="text-center py-12 border-2 border-dashed border-brand-border rounded-2xl bg-brand-card/50">
                      <p className="text-brand-muted text-sm font-medium">No projects match criteria.</p>
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="mt-2 text-brand-primary text-xs font-bold">Clear Search</button>
                      )}
                   </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'map' && (
            <motion.div
              key="map"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-[calc(100vh-280px)] min-h-[400px]"
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-2xl font-bold tracking-tight">Site Map</h2>
                <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-brand-primary"></div>
                   <span className="text-[10px] font-bold text-brand-muted uppercase">Active Construction</span>
                </div>
              </div>
              <div className="w-full h-full rounded-2xl overflow-hidden border border-brand-border shadow-xl">
                 <MapContainer 
                    center={[projects[0]?.coordinates?.lat || 0, projects[0]?.coordinates?.lng || 0]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {projects.map(p => (
                      p.coordinates && (
                        <Marker key={p.id} position={[p.coordinates.lat, p.coordinates.lng]}>
                          <Popup>
                            <div className="p-1">
                                <h4 className="font-bold text-brand-text">{p.name}</h4>
                                <p className="text-xs text-brand-muted">{p.location}</p>
                                <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 inline-block ${
                                    p.status === 'in-progress' ? 'text-brand-primary' : 'text-brand-muted'
                                }`}>
                                    {p.status}
                                </span>
                            </div>
                          </Popup>
                        </Marker>
                      )
                    ))}
                  </MapContainer>
              </div>
            </motion.div>
          )}

          {view === 'project-select' && (
            <motion.div
              key="project-select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <button 
                onClick={() => setView('dashboard')}
                className="text-brand-primary font-bold text-xs uppercase tracking-widest flex items-center gap-1"
              >
                ← Return to menu
              </button>
              
              <h2 className="text-2xl font-bold tracking-tight">Select Project</h2>
              <div className="grid gap-3">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { 
                      setSelectedProject(p); 
                      setView(targetView); 
                    }}
                    className="bg-brand-card p-5 rounded-xl border border-brand-border text-left flex items-center justify-between hover:border-brand-primary hover:shadow-lg transition-all group shadow-sm"
                  >
                    <div>
                      <h4 className="font-bold text-brand-text group-hover:text-brand-primary transition-colors">{p.name}</h4>
                      <p className="text-xs text-brand-muted flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {p.location}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-brand-border group-hover:text-brand-primary" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {view === 'risk-assessment' && selectedProject && (
             <RiskAssessmentView 
                project={selectedProject} 
                onBack={() => setView('dashboard')} 
             />
          )}

          {view === 'attendance' && selectedProject && (
            <AttendanceView 
              project={selectedProject} 
              onBack={() => setView('dashboard')} 
              onNext={() => setView('progress')}
            />
          )}

          {view === 'progress' && selectedProject && (
            <ProgressView 
              project={selectedProject} 
              onBack={() => setView('dashboard')} 
            />
          )}

          {view === 'history' && (
            <HistoryView onBack={() => setView('dashboard')} />
          )}

          {view === 'admin-projects' && (
            <motion.div
              key="admin-projects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="space-y-6"
            >
              <button 
                onClick={() => setView('dashboard')}
                className="text-brand-primary font-bold text-xs uppercase tracking-widest flex items-center gap-1"
              >
                ← Return to dashboard
              </button>
              
              <h2 className="text-2xl font-bold tracking-tight">Project Management</h2>
              
              <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-brand-muted">Register New Site</h4>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest ml-1">Site Name</label>
                    <input 
                      type="text" required value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-brand-primary"
                      placeholder="e.g. Skyline Towers"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest ml-1">Location District</label>
                    <input 
                      type="text" required value={newProjectLocation} onChange={e => setNewProjectLocation(e.target.value)}
                      className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-brand-primary"
                      placeholder="e.g. North Sector"
                    />
                  </div>
                  <button
                    disabled={isCreatingProject}
                    className="w-full py-4 bg-brand-primary text-white font-bold rounded-xl shadow-lg hover:bg-brand-primary-dark transition-all disabled:opacity-50"
                  >
                    {isCreatingProject ? 'REGISTERING...' : 'ADD NEW SITE'}
                  </button>
                </form>
              </div>

              <div className="space-y-3">
                 <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-muted px-1">Recent Sites</h4>
                 {projects.slice(0, 5).map(p => (
                   <div key={p.id} className="bg-brand-card border border-brand-border p-4 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-bold text-brand-text">{p.name}</span>
                      <span className="text-[10px] bg-brand-bg px-2 py-1 rounded-lg text-brand-muted font-bold uppercase">{p.status}</span>
                   </div>
                 ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Nav Hint (Floating Bar) */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 flex justify-center pointer-events-none">
        <div className="bg-brand-sidebar/90 backdrop-blur-xl border border-white/10 p-2 rounded-2xl shadow-2xl flex items-center gap-1 pointer-events-auto">
          <NavButton active={view === 'dashboard'} icon={<HardHat size={22} />} onClick={() => setView('dashboard')} />
          <NavButton active={view === 'map'} icon={<MapIcon size={22} />} onClick={() => setView('map')} />
          
          {/* Quick Access Central Button */}
          <button 
            onClick={() => userProfile?.role === 'admin' ? setView('admin-projects') : setView('project-select')}
            className="group relative -top-6 w-14 h-14 bg-gradient-to-br from-brand-primary to-brand-primary-dark rounded-2xl shadow-xl border-4 border-white flex items-center justify-center text-white transform hover:scale-110 active:scale-95 transition-all"
          >
            <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
            <div className="absolute -bottom-10 opacity-0 group-hover:opacity-100 transition-opacity bg-brand-sidebar text-[10px] font-bold px-2 py-1 rounded uppercase tracking-tighter whitespace-nowrap shadow-xl">
              {userProfile?.role === 'admin' ? 'New Project' : 'Select Project'}
            </div>
          </button>

          <NavButton active={view === 'history'} icon={<History size={22} />} onClick={() => setView('history')} />
        </div>
      </footer>
    </div>
  );
}

// --- Subviews ---

function AttendanceView({ project, onBack, onNext }: { project: Project, onBack: () => void, onNext: () => void }) {
  const [capturing, setCapturing] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (capturing && !selfie) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
        .then(stream => {
          if (videoRef.current) videoRef.current.srcObject = stream;
        });
    }
  }, [capturing, selfie]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const data = canvasRef.current.toDataURL('image/jpeg');
        setSelfie(data);
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        
        navigator.geolocation.getCurrentPosition((pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }, (err) => {
          alert("Location required for attendance.");
        });
      }
    }
  };

  const submitAttendance = async () => {
    if (!selfie || !location) return;
    setSubmitting(true);
    try {
      const docRef = doc(collection(db, 'attendance'));
      const payload = {
        userId: auth.currentUser?.uid,
        projectId: project.id,
        timestamp: serverTimestamp(),
        selfieUrl: selfie,
        latitude: location.lat,
        longitude: location.lng,
        verified: true
      };
      
      if (navigator.onLine) {
        await setDoc(docRef, payload);
      } else {
        setDoc(docRef, payload).catch(console.error);
      }
      onNext();
    } catch (err) {
      alert("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Attendance Check</h2>
        <span className="text-[10px] bg-brand-accent/10 text-brand-accent px-2 py-1 rounded-full font-bold uppercase tracking-wider">
          Step 1 of 2
        </span>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="aspect-square bg-brand-bg rounded-xl overflow-hidden relative border border-brand-border">
          {!capturing && !selfie && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-brand-bg/80 backdrop-blur-sm">
                <Camera size={44} className="text-brand-muted mb-4" />
                <p className="text-brand-muted text-xs mb-6">Camera and Location access needed for verification</p>
                <button 
                  onClick={() => setCapturing(true)}
                  className="px-8 py-3 bg-brand-primary text-white font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  START VERIFICATION
                </button>
            </div>
          )}
          
          {capturing && !selfie && (
            <div className="absolute inset-0">
               <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
               <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                  <button 
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-white rounded-full border-4 border-brand-primary flex items-center justify-center shadow-2xl"
                  >
                    <div className="w-12 h-12 bg-brand-primary/20 rounded-full border-2 border-brand-primary" />
                  </button>
               </div>
            </div>
          )}

          {selfie && (
            <img src={selfie} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {selfie && (
          <div className="bg-brand-bg p-4 rounded-xl border border-brand-border space-y-2">
            <div className="flex items-center gap-2 text-brand-accent text-xs font-bold uppercase tracking-wider">
              <ClipboardCheck size={14} /> Photo Captured
            </div>
            {location ? (
              <div className="flex items-center gap-2 text-brand-primary text-xs font-bold uppercase tracking-wider">
                <MapPin size={14} /> GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-brand-muted text-xs font-bold uppercase tracking-wider animate-pulse">
                Fetching GPS...
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button 
            onClick={onBack}
            className="flex-1 py-4 bg-white text-brand-muted hover:text-brand-text font-bold rounded-xl transition-all border border-brand-border"
          >
            Cancel
          </button>
          <button 
            disabled={!selfie || !location || submitting}
            onClick={submitAttendance}
            className="flex-[2] py-4 bg-brand-primary text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-brand-primary/20"
          >
            {submitting ? 'RECORDING...' : 'REGISTER ATTENDANCE'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function ProgressView({ project, onBack }: { project: Project, onBack: () => void }) {
  const [progress, setProgress] = useState(50);
  const [desc, setDesc] = useState('');
  const [weather, setWeather] = useState('Sunny');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const docRef = doc(collection(db, `projects/${project.id}/reports`));
      const payload = {
        projectId: project.id,
        reporterId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
        description: desc,
        percentageDone: progress,
        materialsUsed: [],
        photoUrls: [],
        weatherConditions: weather
      };
      
      if (navigator.onLine) {
        await setDoc(docRef, payload);
      } else {
        setDoc(docRef, payload).catch(console.error);
      }
      onBack();
    } catch (err) {
      alert("Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Daily Report</h2>
        <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-2 py-1 rounded-full font-bold uppercase tracking-wider">
          Step 2 of 2
        </span>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-6 shadow-sm">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest px-1">Construction Progress</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" min="0" max="100" value={progress} 
              onChange={(e) => setProgress(Number(e.target.value))}
              className="flex-1 accent-brand-primary h-1.5 rounded-full"
            />
            <span className="text-xl font-bold text-brand-primary w-12 text-right">{progress}%</span>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest px-1">Weather conditions</label>
          <div className="grid grid-cols-2 gap-2">
            {['Sunny', 'Cloudy', 'Rainy', 'Stormy'].map(w => (
              <button 
                key={w}
                onClick={() => setWeather(w)}
                className={`py-3 rounded-xl border text-xs font-bold uppercase transition-all ${
                  weather === w ? 'bg-brand-primary/10 border-brand-primary text-brand-primary' : 'bg-brand-bg border-brand-border text-brand-muted'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest px-1">Activity Log</label>
          <textarea 
            placeholder="Detailed activity description..."
            className="w-full h-32 bg-brand-bg border border-brand-border rounded-xl p-4 text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 transition-all"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
           <div className="bg-brand-bg p-4 rounded-xl border border-brand-border flex flex-col items-center justify-center text-center gap-1 group cursor-pointer hover:border-brand-primary hover:bg-white transition-all shadow-sm">
              <Package size={18} className="text-brand-muted group-hover:text-brand-primary" />
              <span className="text-[10px] font-bold text-brand-muted uppercase group-hover:text-brand-text">Materials</span>
           </div>
           <div className="bg-brand-bg p-4 rounded-xl border border-brand-border flex flex-col items-center justify-center text-center gap-1 group cursor-pointer hover:border-brand-primary hover:bg-white transition-all shadow-sm">
              <Camera size={18} className="text-brand-muted group-hover:text-brand-primary" />
              <span className="text-[10px] font-bold text-brand-muted uppercase group-hover:text-brand-text">Photos</span>
           </div>
        </div>

        <button 
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full py-4 bg-brand-primary text-white font-bold rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-brand-primary/20"
        >
          {submitting ? 'UPLOADING...' : 'SUBMIT SITE REPORT'}
        </button>
      </div>
    </motion.div>
  );
}

function HistoryView({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'attendance'), where('userId', '==', auth.currentUser?.uid), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      const logsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          timestamp: data.timestamp && typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : new Date(),
          isPending: snapshot.metadata.hasPendingWrites || doc.metadata.hasPendingWrites
        };
      });
      setLogs(logsData);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
       <button 
        onClick={onBack}
        className="text-brand-primary font-bold text-xs uppercase tracking-widest flex items-center gap-1"
      >
        ← Back to menu
      </button>
      <h2 className="text-2xl font-bold tracking-tight">Activity Logs</h2>
      
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-brand-muted">Loading historical data...</div>
        ) : (
          <div className="bg-brand-card border border-brand-border rounded-2xl p-6 shadow-sm">
            <p className="text-brand-muted text-xs italic text-center mb-6">
              {!navigator.onLine ? "Viewing offline cached data" : "All logs are encrypted and synchronized with core servers."}
            </p>
            <div className="space-y-3">
                {logs.length === 0 ? (
                  <p className="text-center text-brand-muted text-sm py-4">No logs found.</p>
                ) : logs.map(log => (
                  <div key={log.id} className={`p-4 bg-brand-bg border ${log.isPending ? 'border-amber-500/50 block opacity-90' : 'border-brand-border'} rounded-xl flex items-center justify-between gap-4 transition-all`}>
                    <div className="flex items-center gap-4">
                       <div className={`w-10 h-10 ${log.isPending ? 'bg-amber-500/10 text-amber-500' : 'bg-brand-accent/10 text-brand-accent'} rounded-lg flex items-center justify-center font-bold text-xs uppercase`}>
                         {log.isPending ? '...' : 'OK'}
                       </div>
                       <div>
                          <h4 className="font-bold text-brand-text text-sm">Attendance Log</h4>
                          <p className="text-[10px] text-brand-muted uppercase tracking-widest font-semibold flex items-center gap-1">
                            {format(log.timestamp, 'MMM do, h:mm a')}
                          </p>
                       </div>
                    </div>
                    {log.isPending && (
                       <span className="text-[9px] bg-amber-500/10 text-amber-600 px-2 py-1 rounded-full uppercase tracking-widest font-black whitespace-nowrap">
                         Pending Sync
                       </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function RiskAssessmentView({ project, onBack }: { project: Project, onBack: () => void }) {
  const [activity, setActivity] = useState('');
  const [items, setItems] = useState<RiskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const generateDraft = async () => {
    if (!activity) return;
    setLoading(true);
    const photoData = photo?.split(',')[1];
    const draft = await generateRiskDraft(activity, photoData);
    setItems(draft);
    setLoading(false);
  };

  const updateItem = (id: string, field: keyof RiskRow, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'likelihood' || field === 'severity') {
          updated.riskScore = Number(updated.likelihood) * Number(updated.severity);
        }
        return updated;
      }
      return item;
    }));
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const confirmItem = (id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, status: 'confirmed' as const, requiresReview: false } : item));
  };

  const exportAssessment = () => {
    // Generate text version
    const content = `RISK ASSESSMENT: ${project.name}\nLocation: ${project.location}\nDate: ${new Date().toLocaleDateString()}\nActivity: ${activity}\n\n` + 
      items.map(item => `[${item.category}] Hazard: ${item.hazard}\nImpact: ${item.impact}\nLikelihood: ${item.likelihood} | Severity: ${item.severity} | Score: ${item.riskScore}\nControls: ${item.controls}\n---`).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Risk_Assessment_${project.name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    const data = items.map(item => ({
      Category: item.category,
      Hazard: item.hazard,
      Impact: item.impact,
      Likelihood: item.likelihood,
      Severity: item.severity,
      'Risk Score': item.riskScore,
      'Control Measures': item.controls,
      Source: item.source,
      Status: item.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Risk Assessment");
    XLSX.writeFile(wb, `Risk_Assessment_${project.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const resetDraft = () => {
    setActivity('');
    setItems([]);
    setPhoto(null);
  };

  const getRiskColor = (score: number) => {
    if (score >= 15) return 'bg-red-500 text-white border-red-600';
    if (score >= 8) return 'bg-orange-500 text-white border-orange-600';
    if (score >= 4) return 'bg-yellow-500 text-brand-text border-yellow-600';
    return 'bg-brand-accent/20 text-brand-accent border-brand-accent/40';
  };

  const saveDraft = () => {
    if (!activity || items.length === 0) return;
    const doc = {
      projectId: project.id,
      projectName: project.name,
      location: project.location,
      author: auth.currentUser?.email || 'Anonymous',
      date: new Date().toISOString(),
      activity,
      rows: items
    };
    saveRiskDocLocal(doc);
    alert("Draft saved to browser storage.");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Risk Auditor</h2>
        <div className="flex gap-2">
           <button onClick={saveDraft} className="bg-brand-card border border-brand-border text-brand-muted p-2 rounded-lg hover:text-brand-primary transition-all">
              <Save size={18} />
           </button>
           <button onClick={onBack} className="text-brand-primary font-bold text-xs uppercase tracking-widest hover:bg-brand-primary/5 px-2 py-1 rounded-lg transition-colors">Return</button>
        </div>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="space-y-3">
          <label className="text-[10px] font-bold uppercase text-brand-muted tracking-widest px-1">Site Activity / Task</label>
          <input 
            type="text"
            placeholder="e.g. Scaffolding erection, Concrete pouring"
            className="w-full bg-brand-bg border border-brand-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-brand-primary transition-all focus:ring-2 focus:ring-brand-primary/10"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
           <button 
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 py-3 border font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              photo ? "bg-brand-accent/10 border-brand-accent text-brand-accent" : "bg-white border-brand-border text-brand-muted hover:bg-brand-bg"
            }`}
           >
              <Camera size={14} /> {photo ? 'Hint Uploaded' : 'Photo Hint'}
           </button>
           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoSelect} />
           
           <button 
            disabled={!activity || loading}
            onClick={generateDraft}
            className="flex-1 py-3 bg-brand-primary text-white font-bold rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-brand-primary/20 hover:bg-brand-primary-dark"
           >
              {loading ? 'DRAFTING...' : (items.length > 0 ? 'RE-DRAFT' : 'GENERATE DRAFT')}
           </button>
        </div>
      </div>

      {items.length > 0 && (
         <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
               <h3 className="text-xs font-bold uppercase tracking-widest text-brand-muted">Scoring: L × S = Risk</h3>
               <div className="flex items-center gap-3">
                  <button onClick={resetDraft} className="text-brand-muted text-[10px] font-bold uppercase hover:text-red-500 transition-colors">Clear</button>
                  <button onClick={exportExcel} className="text-white text-[10px] font-bold uppercase flex items-center gap-1.5 bg-green-600 px-3 py-1.5 rounded-lg shadow-sm hover:bg-green-700 transition-all">
                     <FileText size={14} /> Excel Export
                  </button>
               </div>
            </div>

            <div className="space-y-3">
               {items.map(item => (
                 <div key={item.id} className={`bg-brand-card border ${item.requiresReview ? 'border-amber-200 bg-amber-50/10' : 'border-brand-border'} rounded-xl p-5 space-y-4 shadow-sm relative overflow-hidden group`}>
                    {item.requiresReview && <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>}
                    
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-md border ${getRiskColor(item.riskScore)}`}>
                             Score: {item.riskScore}
                          </span>
                          <span className="text-[10px] font-bold text-brand-muted uppercase tracking-wider">{item.category}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={() => confirmItem(item.id)} 
                            className={`p-1.5 rounded-lg transition-all ${
                               item.status === 'confirmed' ? 'bg-brand-accent/10 text-brand-accent' : 'text-brand-muted hover:bg-brand-accent/5 hover:text-brand-accent'
                            }`}
                          >
                             <CheckCircle2 size={18} />
                          </button>
                          <button onClick={() => deleteItem(item.id)} className="text-brand-muted hover:bg-red-50 hover:text-red-500 p-1.5 rounded-lg transition-all">
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </div>

                    <div className="space-y-4">
                       <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1">
                             <label className="text-[9px] font-bold uppercase text-brand-muted tracking-[0.15em] opacity-60">Identified Hazard</label>
                             <textarea 
                                className="w-full bg-transparent border-none p-0 text-sm font-bold text-brand-text focus:ring-0 resize-none"
                                value={item.hazard}
                                onChange={(e) => updateItem(item.id, 'hazard', e.target.value)}
                                rows={1}
                             />
                          </div>
                          
                          <div className="flex gap-4 p-3 bg-brand-bg/50 rounded-xl border border-brand-border/30">
                             <div className="flex-1 space-y-1">
                                <label className="text-[8px] font-black uppercase text-brand-muted tracking-widest">Likelihood (1-5)</label>
                                <select 
                                   value={item.likelihood}
                                   onChange={(e) => updateItem(item.id, 'likelihood', Number(e.target.value))}
                                   className="w-full bg-white border border-brand-border rounded-lg text-xs py-1"
                                >
                                   {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                             </div>
                             <div className="flex-1 space-y-1">
                                <label className="text-[8px] font-black uppercase text-brand-muted tracking-widest">Severity (1-5)</label>
                                <select 
                                   value={item.severity}
                                   onChange={(e) => updateItem(item.id, 'severity', Number(e.target.value))}
                                   className="w-full bg-white border border-brand-border rounded-lg text-xs py-1"
                                >
                                   {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                </select>
                             </div>
                          </div>

                          <div className="space-y-1.5 bg-brand-bg/40 p-3 rounded-lg border border-brand-border/50">
                             <label className="text-[9px] font-bold uppercase text-brand-primary tracking-[0.15em]">Control Measures</label>
                             <textarea 
                                className="w-full bg-transparent border-none p-0 text-xs text-brand-text font-medium focus:ring-0"
                                value={item.controls}
                                onChange={(e) => updateItem(item.id, 'controls', e.target.value)}
                                rows={3}
                             />
                          </div>
                       </div>
                    </div>

                    {item.requiresReview && (
                       <div className="flex items-center gap-2 text-[9px] font-bold text-amber-600 uppercase tracking-widest bg-amber-50 p-2 rounded-lg border border-amber-100">
                          <AlertCircle size={12} /> Photo Source: High uncertainty - please verify
                       </div>
                    )}
                 </div>
               ))}
               
               <p className="text-[10px] text-center text-brand-muted mt-4">
                 Risk Level Matrix: 1-5 (Low), 6-12 (Medium), 15-25 (High/Critical)
               </p>
            </div>
         </div>
      )}
    </motion.div>
  );
}

// --- Helper Comps ---

function MenuButton({ icon, title, subtitle, color, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-brand-card border border-brand-border hover:border-brand-primary hover:shadow-md transition-all flex items-center gap-4 group shadow-sm"
    >
      <div className={`${color} group-hover:scale-110 transition-transform`}>{icon}</div>
      <div className="flex-1">
        <h4 className="font-bold text-brand-text text-sm">{title}</h4>
        <p className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">{subtitle}</p>
      </div>
      <ChevronRight className="text-brand-border group-hover:text-brand-primary group-hover:translate-x-1 transition-all" size={18} />
    </button>
  );
}

function NavButton({ active, icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`p-3 rounded-xl transition-all ${
        active ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/40' : 'text-white/40 hover:bg-white/10'
      }`}
    >
      {icon}
    </button>
  );
}
