import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, X, Save, Loader2, Users, Video } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import EnrollmentManager from '../components/EnrollmentManager';
import { useAuth } from '../../../context/AuthContext';

import { useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:5000/api/courses';

const ManageCourses = () => {
    const navigate = useNavigate();
    const [collapsed, setCollapsed] = useState(false);
    const { token } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [enrollmentCourse, setEnrollmentCourse] = useState(null);
    const [editingCourse, setEditingCourse] = useState(null);
    const [formData, setFormData] = useState({
        title: '', description: '', category: 'Other', instructor: '',
        level: 'Beginner', price: 0, status: 'draft', tags: '', thumbnail: '',
        refundWindowDays: '', refundPercentage: ''
    });

    // Fetch courses
    const fetchCourses = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/admin/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) setCourses(data.data);
        } catch (err) {
            console.error('Failed to fetch courses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCourses(); }, []);

    // Handle form input
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Open modal for create/edit
    const openModal = (course = null) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                title: course.title,
                description: course.description,
                category: course.category,
                instructor: course.instructor,
                level: course.level,
                price: course.price,
                status: course.status,
                tags: course.tags?.join(', ') || '',
                thumbnail: course.thumbnail || '',
                refundWindowDays: course.refundWindowDays || '',
                refundPercentage: course.refundPercentage || ''
            });
        } else {
            setEditingCourse(null);
            setFormData({
                title: '',
                description: '',
                category: 'Other',
                instructor: '',
                level: 'Beginner',
                price: 0,
                status: 'draft',
                tags: '',
                thumbnail: '',
                refundWindowDays: '',
                refundPercentage: ''
            });
        }
        setIsModalOpen(true);
    };

    // Save course (create or update)
    const saveCourse = async (e) => {
        e.preventDefault();
        const body = {
            ...formData,
            tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
            refundWindowDays: formData.refundWindowDays !== '' ? Number(formData.refundWindowDays) : null,
            refundPercentage: formData.refundPercentage !== '' ? Number(formData.refundPercentage) : null
        };
        const url = editingCourse ? `${API_BASE}/admin/${editingCourse._id}` : `${API_BASE}/admin`;
        const method = editingCourse ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                fetchCourses();
            } else {
                alert(data.message || 'Error saving course');
            }
        } catch (err) {
            alert('Failed to save course');
        }
    };

    // Delete course
    const deleteCourse = async (id) => {
        if (!window.confirm('Are you sure you want to delete this course?')) return;
        try {
            const res = await fetch(`${API_BASE}/admin/${id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) fetchCourses();
        } catch (err) {
            alert('Failed to delete course');
        }
    };

    const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-100">
            <AdminSidebar collapsed={collapsed} setCollapsed={setCollapsed} />

            <main className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'} p-8`}>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Manage Courses</h1>
                        <p className="text-slate-400">Create, edit, and manage learning content.</p>
                    </div>
                    <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition shadow-lg shadow-blue-600/20">
                        <Plus size={18} /> Add Course
                    </button>
                </div>

                {/* Search */}
                <div className="relative max-w-md mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
                </div>

                {/* Table */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
                    ) : filteredCourses.length === 0 ? (
                        <div className="text-center py-20 text-slate-500">No courses found. Click "Add Course" to create one.</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-slate-800/50 text-left text-sm text-slate-400 uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Title</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Level</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredCourses.map(course => (
                                    <tr key={course._id} className="hover:bg-slate-800/30 transition">
                                        <td className="px-6 py-4 font-medium text-white">{course.title}</td>
                                        <td className="px-6 py-4 text-slate-400">{course.category}</td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-slate-700 text-slate-300">{course.level}</span></td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${course.status === 'published' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                                {course.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => navigate(`/admin/courses/${course._id}/editor`)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-indigo-400 transition" title="Manage Content"><Video size={16} /></button>
                                            <button onClick={() => setEnrollmentCourse(course)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400 transition" title="Manage Enrollments"><Users size={16} /></button>
                                            <button onClick={() => openModal(course)} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"><Pencil size={16} /></button>
                                            <button onClick={() => deleteCourse(course._id)} className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-800">
                            <h2 className="text-xl font-bold text-white">{editingCourse ? 'Edit Course' : 'Add New Course'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-lg"><X size={20} /></button>
                        </div>
                        <form onSubmit={saveCourse} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Title *</label>
                                <input name="title" value={formData.title} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Description *</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Thumbnail URL</label>
                                <input name="thumbnail" value={formData.thumbnail} onChange={handleChange} placeholder="https://example.com/image.jpg" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                                    <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                                        {['Web Development', 'Mobile Development', 'Data Science', 'AI/ML', 'DevOps', 'Cybersecurity', 'Blockchain', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Level</label>
                                    <select name="level" value={formData.level} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                                        {['Beginner', 'Intermediate', 'Advanced'].map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Instructor *</label>
                                    <input name="instructor" value={formData.instructor} onChange={handleChange} required className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Price ($)</label>
                                    <input name="price" type="number" value={formData.price} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Tags (comma separated)</label>
                                <input name="tags" value={formData.tags} onChange={handleChange} placeholder="React, JavaScript, Frontend" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500">
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Refund Window (Days)</label>
                                    <input name="refundWindowDays" type="number" value={formData.refundWindowDays} onChange={handleChange} placeholder="e.g., 30 (default)" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-400 mb-2">Refund Percentage (%)</label>
                                    <input name="refundPercentage" type="number" value={formData.refundPercentage} onChange={handleChange} placeholder="e.g., 90 (default)" className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition">Cancel</button>
                                <button type="submit" className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition">
                                    <Save size={18} /> {editingCourse ? 'Update' : 'Create'} Course
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Enrollment Manager Modal */}
            <EnrollmentManager
                course={enrollmentCourse}
                isOpen={!!enrollmentCourse}
                onClose={() => setEnrollmentCourse(null)}
            />
        </div >
    );
};

export default ManageCourses;
