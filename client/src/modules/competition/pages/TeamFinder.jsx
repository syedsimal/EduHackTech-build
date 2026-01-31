import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Users,
    Code2,
    Palette,
    Bot,
    Mic2,
    Monitor,
    Loader2,
    X,
    Check,
    Clock,
    Zap,
    UserPlus,
    AlertCircle,
    MessageCircle,
    Search
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import {
    upsertCard,
    getMyCard,
    getMatches,
    updateActive,
    sendConnect,
    respondConnect,
    getActiveCount
} from '../../../services/teamFinder.service';
import { getOrCreateConversation, getUnreadCount } from '../../../services/chat.service';
import ChatModal from '../../../components/competition/ChatModal';

const ROLES = [
    { value: 'Frontend', icon: Monitor },
    { value: 'Backend', icon: Code2 },
    { value: 'Full Stack', icon: Zap },
    { value: 'ML / AI', icon: Bot },
    { value: 'UI/UX', icon: Palette },
    { value: 'Pitch / Business', icon: Mic2 }
];
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const AVAILABILITY = ['Weekdays', 'Weekends', 'Nights', 'Full-time'];
const INTERESTS = ['Web', 'AI', 'Web3', 'Mobile', 'Open Innovation'];
const LOOKING_FOR = ['Team', 'Teammates'];

const ROLE_ICONS = Object.fromEntries(ROLES.map(({ value, icon }) => [value, icon]));

const defaultForm = {
    role: 'Backend',
    secondaryRole: '',
    level: 'Intermediate',
    availability: [],
    interests: [],
    lookingFor: 'Teammates',
    bio: ''
};

const TeamFinder = () => {
    const { id: eventId } = useParams(); // From /competition/:id/team-finder
    const navigate = useNavigate();
    const { user, token } = useAuth();
    const [myCard, setMyCard] = useState(null);
    const [matches, setMatches] = useState([]);
    const [activeCount, setActiveCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState(defaultForm);
    const [error, setError] = useState('');
    const [connectLoading, setConnectLoading] = useState(null);
    const [acceptLoading, setAcceptLoading] = useState(null);
    const [chatWith, setChatWith] = useState(null);
    const [unreadByUser, setUnreadByUser] = useState({});
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [matchesLoading, setMatchesLoading] = useState(false);
    const [filters, setFilters] = useState({
        role: '',
        interests: [],
        availability: []
    });

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        if (!user || !token) {
            navigate('/login');
            return;
        }
        // Only show global loading on first mount or when eventId changes drastically
        const isInitial = !myCard;
        loadData(isInitial);
    }, [user, token, eventId, debouncedSearch, filters]);

    const loadData = async (showGlobalLoader = false) => {
        if (showGlobalLoader) setLoading(true);
        else setMatchesLoading(true);

        try {
            const searchParams = {
                q: debouncedSearch.trim() || undefined,
                role: filters.role || undefined,
                interests: filters.interests.length > 0 ? filters.interests.join(',') : undefined,
                availability: filters.availability.length > 0 ? filters.availability.join(',') : undefined
            };

            const [cardRes, matchesRes, count, unreadRes] = await Promise.all([
                getMyCard(token).catch(() => null),
                getMatches(eventId || null, token, searchParams).catch(() => ({ data: [], count: 0 })),
                getActiveCount().catch(() => 0),
                getUnreadCount(token).catch(() => ({ count: 0, byUser: {} }))
            ]);
            setMyCard(cardRes);
            setMatches(matchesRes?.data || []);
            setActiveCount(count);
            setUnreadByUser(unreadRes?.byUser || {});
            if (!cardRes) {
                setShowForm(true);
                setFormData(defaultForm);
            } else {
                setFormData({
                    role: cardRes.role,
                    secondaryRole: cardRes.secondaryRole || '',
                    level: cardRes.level,
                    availability: cardRes.availability || [],
                    interests: cardRes.interests || [],
                    lookingFor: cardRes.lookingFor || 'Teammates',
                    bio: cardRes.bio || ''
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setMatchesLoading(false);
        }
    };

    const handleSave = async () => {
        setError('');
        setSaving(true);
        try {
            const card = await upsertCard(formData, token);
            setMyCard(card);
            setShowForm(false);
            loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleAvailability = (v) => {
        const arr = formData.availability.includes(v)
            ? formData.availability.filter((x) => x !== v)
            : [...formData.availability, v];
        setFormData({ ...formData, availability: arr });
    };
    const toggleInterests = (v) => {
        const arr = formData.interests.includes(v)
            ? formData.interests.filter((x) => x !== v)
            : [...formData.interests, v];
        setFormData({ ...formData, interests: arr });
    };

    const toggleFilterInterests = (v) => {
        setFilters(prev => ({
            ...prev,
            interests: prev.interests.includes(v)
                ? prev.interests.filter(x => x !== v)
                : [...prev.interests, v]
        }));
    };

    const toggleFilterAvailability = (v) => {
        setFilters(prev => ({
            ...prev,
            availability: prev.availability.includes(v)
                ? prev.availability.filter(x => x !== v)
                : [...prev.availability, v]
        }));
    };

    const handleConnect = async (toUserId) => {
        setConnectLoading(toUserId);
        try {
            await sendConnect(toUserId, eventId || null, '', token);
            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setConnectLoading(null);
        }
    };

    const handleAcceptConnect = async (requestId) => {
        setAcceptLoading(requestId);
        try {
            await respondConnect(requestId, 'accepted', token);
            await loadData(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setAcceptLoading(null);
        }
    };

    const handleOpenChat = async (otherUser) => {
        try {
            const conv = await getOrCreateConversation(otherUser._id, token);
            setChatWith({ user: otherUser, conversation: conv });
        } catch (err) {
            setError(err.message);
        }
    };

    const handleActiveChange = async (active) => {
        try {
            const card = await updateActive(active, token);
            setMyCard(card);
            await loadData(); // Refresh matches and active count
        } catch (err) {
            setError(err.message);
        }
    };

    const formatLastActive = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const diff = Date.now() - d.getTime();
        if (diff < 60 * 60 * 1000) return 'Just now';
        if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
        if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))}d ago`;
        return d.toLocaleDateString();
    };

    if (!user || !token) return null;
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-comp-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white pb-24">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">Find Teammates</h1>
                        <p className="text-slate-400 mt-1">
                            {eventId ? 'Find teammates for this hackathon' : 'Connect with people building for hackathons'}
                        </p>
                    </div>
                    {!showForm && myCard && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="px-4 py-2 bg-comp-600 hover:bg-comp-500 rounded-xl font-medium transition"
                        >
                            Edit Card
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-300">
                        <AlertCircle size={20} />
                        {error}
                    </div>
                )}

                {/* Active Toggle */}
                {myCard && !showForm && (
                    <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-2xl">
                        <p className="text-sm font-medium text-slate-400 mb-3">Your availability</p>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { value: 'actively_looking', label: 'Actively Looking', color: 'green', dot: '🟢' },
                                { value: 'busy', label: 'Busy', color: 'yellow', dot: '🟡' },
                                { value: 'not_looking', label: 'Not Looking', color: 'red', dot: '🔴' }
                            ].map(({ value, label, color }) => (
                                <button
                                    key={value}
                                    onClick={() => handleActiveChange(value)}
                                    className={`px-4 py-2 rounded-xl font-medium transition ${myCard.active === value
                                        ? color === 'green'
                                            ? 'bg-green-600 text-white'
                                            : color === 'yellow'
                                                ? 'bg-yellow-600 text-white'
                                                : 'bg-slate-600 text-white'
                                        : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Search & Filters */}
                {myCard && myCard.active !== 'not_looking' && (
                    <div className="mb-6 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, role, or interest..."
                                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:ring-2 focus:ring-comp-500 outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Filters Container */}
                        <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-2xl space-y-4">
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[80px]">Role</span>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setFilters({ ...filters, role: '' })}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${!filters.role ? 'bg-comp-600 text-white shadow-md' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                }`}
                                        >
                                            All
                                        </button>
                                        {ROLES.map(({ value }) => (
                                            <button
                                                key={value}
                                                onClick={() => setFilters({ ...filters, role: filters.role === value ? '' : value })}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${filters.role === value
                                                        ? 'bg-comp-600 text-white shadow-md ring-2 ring-comp-400/30'
                                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[80px]">Interests</span>
                                    <div className="flex flex-wrap gap-2">
                                        {INTERESTS.map(i => (
                                            <button
                                                key={i}
                                                onClick={() => toggleFilterInterests(i)}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${filters.interests.includes(i)
                                                        ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/30'
                                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {i}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[80px]">Availability</span>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABILITY.map(a => (
                                            <button
                                                key={a}
                                                onClick={() => toggleFilterAvailability(a)}
                                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${filters.availability.includes(a)
                                                        ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/30'
                                                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Urgency Boost */}
                {activeCount > 0 && (
                    <div className="mb-6 p-4 bg-comp-500/20 border border-comp-500/40 rounded-xl flex items-center gap-3 animate-fadeIn">
                        <Clock size={24} className="text-comp-500" />
                        <p className="text-comp-200 font-medium">
                            <strong>{activeCount}</strong> {activeCount === 1 ? 'person is' : 'people are'} forming teams for hackathons right now
                        </p>
                    </div>
                )}

                {/* Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-slate-800 border border-slate-600 w-full max-w-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fadeIn">
                            <div className="bg-gradient-to-r from-comp-600 to-comp-500 px-6 py-4 flex justify-between items-center">
                                <h2 className="text-xl font-bold">Your Team Finder Card</h2>
                                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Primary Role *</label>
                                    <div className="flex flex-wrap gap-2">
                                        {ROLES.map(({ value, icon: Icon }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, role: value })}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 ${formData.role === value
                                                    ? 'bg-comp-600 text-white shadow-lg shadow-comp-500/30 ring-2 ring-comp-400'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                <Icon size={18} />
                                                {value}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Secondary Role (optional)</label>
                                    <select
                                        value={formData.secondaryRole}
                                        onChange={(e) => setFormData({ ...formData, secondaryRole: e.target.value })}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white"
                                    >
                                        <option value="">None</option>
                                        {ROLES.map((r) => (
                                            <option key={r.value} value={r.value}>{r.value}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Experience Level *</label>
                                    <div className="flex gap-2">
                                        {LEVELS.map((l) => (
                                            <button
                                                key={l}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, level: l })}
                                                className={`px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 ${formData.level === l
                                                    ? 'bg-comp-600 text-white shadow-lg shadow-comp-500/30 ring-2 ring-comp-400'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Time Availability</label>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABILITY.map((a) => (
                                            <button
                                                key={a}
                                                type="button"
                                                onClick={() => toggleAvailability(a)}
                                                className={`px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 ${formData.availability.includes(a)
                                                    ? 'bg-comp-600 text-white shadow-lg shadow-comp-500/30 ring-2 ring-comp-400'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {a}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Hackathon Interests</label>
                                    <div className="flex flex-wrap gap-2">
                                        {INTERESTS.map((i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => toggleInterests(i)}
                                                className={`px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 ${formData.interests.includes(i)
                                                    ? 'bg-comp-600 text-white shadow-lg shadow-comp-500/30 ring-2 ring-comp-400'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {i}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Looking For</label>
                                    <div className="flex gap-2">
                                        {LOOKING_FOR.map((l) => (
                                            <button
                                                key={l}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, lookingFor: l })}
                                                className={`px-4 py-2.5 rounded-xl transition-all duration-200 hover:scale-105 ${formData.lookingFor === l
                                                    ? 'bg-comp-600 text-white shadow-lg shadow-comp-500/30 ring-2 ring-comp-400'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                                    }`}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">Short Bio (140 chars)</label>
                                    <textarea
                                        value={formData.bio}
                                        onChange={(e) => setFormData({ ...formData, bio: e.target.value.slice(0, 140) })}
                                        maxLength={140}
                                        rows={2}
                                        className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 resize-none"
                                        placeholder="Tell teammates what you bring..."
                                    />
                                    <p className="text-xs text-slate-500 mt-1">{formData.bio.length}/140</p>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-slate-800/80 border-t border-slate-700">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full py-3 bg-comp-600 hover:bg-comp-500 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                    Save Card
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Matches Section */}
                {myCard && myCard.active !== 'not_looking' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Users size={24} />
                            {matches.length > 0 ? (
                                <span>{matches.length} {matches.length === 1 ? 'person is' : 'people are'} looking for teammates like you</span>
                            ) : (
                                <span>No matches yet</span>
                            )}
                        </h2>
                        {matchesLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                <Loader2 className="w-10 h-10 text-comp-500 animate-spin mb-4" />
                                <p className="text-slate-500 text-sm">Updating results...</p>
                            </div>
                        ) : matches.length === 0 ? (
                            <div className="p-12 bg-slate-800/30 border border-slate-700 rounded-2xl text-center text-slate-400">
                                <Users size={48} className="mx-auto mb-4 opacity-50" />
                                <p>Check back soon — more people are joining every day!</p>
                                <p className="text-sm mt-2">Make sure you&apos;re set to &quot;Actively Looking&quot; above.</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {matches.map((match, idx) => {
                                    const Icon = ROLE_ICONS[match.role] || Code2;
                                    const connectStatus = match.connectStatus;
                                    const canConnect = !connectStatus || (connectStatus.status === 'rejected' && connectStatus.fromMe);
                                    const isPending = connectStatus?.status === 'pending';
                                    const isAccepted = connectStatus?.status === 'accepted';
                                    return (
                                        <div
                                            key={match.user._id}
                                            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 hover:border-comp-500/50 transition-all animate-fadeIn"
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-14 h-14 rounded-xl bg-comp-600/30 flex items-center justify-center flex-shrink-0">
                                                        <Icon className="text-comp-400" size={28} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg">{match.user?.name || 'Anonymous'}</h3>
                                                        <p className="text-slate-400 text-sm">
                                                            {match.role}
                                                            {match.secondaryRole && ` + ${match.secondaryRole}`} • {match.level}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {match.interests?.slice(0, 3).map((i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-slate-700 rounded-lg text-xs text-slate-300">{i}</span>
                                                            ))}
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 mt-1">
                                                            {match.availability?.slice(0, 3).map((a) => (
                                                                <span key={a} className="px-2 py-0.5 bg-slate-600/50 rounded-lg text-xs text-slate-400">{a}</span>
                                                            ))}
                                                        </div>
                                                        {match.bio && (
                                                            <p className="text-slate-400 text-sm mt-2 italic">&quot;{match.bio}&quot;</p>
                                                        )}
                                                        <p className="text-slate-500 text-xs mt-1">
                                                            Last active: {formatLastActive(match.lastActiveAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 flex-shrink-0">
                                                    <div className="text-right">
                                                        <span className="inline-block px-3 py-1 bg-comp-600/30 text-comp-400 rounded-lg font-bold">
                                                            {match.matchScore}% match
                                                        </span>
                                                    </div>
                                                    {isAccepted ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-4 py-2 bg-green-600/30 text-green-400 rounded-xl font-medium flex items-center gap-2">
                                                                <Check size={18} /> Connected
                                                            </span>
                                                            <button
                                                                onClick={() => handleOpenChat(match.user)}
                                                                className="relative px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium flex items-center gap-2 transition"
                                                            >
                                                                <MessageCircle size={18} /> Chat
                                                                {(unreadByUser[match.user._id] || unreadByUser[match.user._id?.toString?.()]) > 0 && (
                                                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-slate-800">
                                                                        {Math.min(unreadByUser[match.user._id] || unreadByUser[match.user._id?.toString?.()] || 0, 99)}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        </div>
                                                    ) : isPending && !connectStatus?.fromMe ? (
                                                        <button
                                                            onClick={() => handleAcceptConnect(connectStatus.requestId)}
                                                            disabled={acceptLoading === connectStatus.requestId}
                                                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded-xl flex items-center gap-2 transition disabled:opacity-50"
                                                        >
                                                            {acceptLoading === connectStatus?.requestId ? (
                                                                <Loader2 className="animate-spin" size={18} />
                                                            ) : (
                                                                <>
                                                                    <Check size={18} /> Accept & Connect
                                                                </>
                                                            )}
                                                        </button>
                                                    ) : isPending && connectStatus?.fromMe ? (
                                                        <span className="px-4 py-2 bg-yellow-600/30 text-yellow-400 rounded-xl font-medium">
                                                            Pending
                                                        </span>
                                                    ) : canConnect && (
                                                        <button
                                                            onClick={() => handleConnect(match.user._id)}
                                                            disabled={connectLoading === match.user._id}
                                                            className="px-4 py-2 bg-comp-600 hover:bg-comp-500 rounded-xl font-medium flex items-center gap-2 transition disabled:opacity-50"
                                                        >
                                                            {connectLoading === match.user._id ? (
                                                                <Loader2 className="animate-spin" size={18} />
                                                            ) : (
                                                                <>
                                                                    <UserPlus size={18} />
                                                                    Connect
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Chat Modal */}
            {chatWith && (
                <ChatModal
                    isOpen={!!chatWith}
                    onClose={() => { setChatWith(null); loadData(false); }}
                    otherUser={chatWith.user}
                    conversation={chatWith.conversation}
                    currentUser={user}
                    token={token}
                    onMarkRead={() => getUnreadCount(token).then(r => setUnreadByUser(r?.byUser || {}))}
                />
            )}
        </div>
    );
};

export default TeamFinder;
