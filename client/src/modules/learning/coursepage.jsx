import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PlayCircle,
  Clock,
  Layers,
  CheckCircle,
  ArrowLeft,
  Loader2,
  Edit,
  User,
  Star,
  Tag,
  Lock,
  LogIn,
} from "lucide-react";

import { getCourse, getCourseContent } from "../../services/course.service";
import { checkEnrollment } from "../../services/enrollment.service";
import { checkRefundEligibility, requestRefund } from "../../services/refund.service";
import { useAuth } from "../../context/AuthContext";
import CourseEditModal from "../../components/common/CourseEditModal";

const CoursePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [course, setCourse] = useState(null);
  const [content, setContent] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [refundEligibility, setRefundEligibility] = useState(null);

  const [loading, setLoading] = useState(true);
  const [requestingRefund, setRequestingRefund] = useState(false);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const courseData = await getCourse(id);
        const contentData = await getCourseContent(id);

        setCourse(courseData);
        setContent(contentData);

        if (token && !isAdmin) {
          const enrollmentData = await checkEnrollment(id, token);
          if (enrollmentData.enrolled) {
            setEnrollment(enrollmentData.data);

            // Check refund eligibility if enrolled
            try {
              const eligibilityData = await checkRefundEligibility(enrollmentData.data._id, token);
              setRefundEligibility(eligibilityData.data);
            } catch (err) {
              console.error("Failed to fetch refund eligibility", err);
            }
          }
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load course");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, token, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg mb-4">Course not found</p>
        <button
          onClick={() => navigate("/learning")}
          className="px-6 py-3 bg-blue-600 text-white rounded-full"
        >
          Back to Learning
        </button>
      </div>
    );
  }

  const hasAccess = isAdmin || !!enrollment;

  const isModuleCompleted = (module) => {
    if (!enrollment) return false;
    const lessonIds = module.lessons.map((l) => l._id);
    return lessonIds.every((id) => enrollment.completedModules?.includes(id));
  };

  const handleRequestRefund = async () => {
    if (!enrollment || !refundEligibility?.isEligible) return;

    if (!window.confirm("Are you sure you want to request a refund for this course?")) return;

    try {
      setRequestingRefund(true);
      const result = await requestRefund(enrollment._id, "Course completion refund request", token);
      alert(result.message || "Refund request submitted successfully!");

      // Update local state
      setRefundEligibility(prev => ({
        ...prev,
        isEligible: false,
        reason: "Refund already requested"
      }));
      setEnrollment(prev => ({
        ...prev,
        refundStatus: 'pending'
      }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to request refund");
    } finally {
      setRequestingRefund(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* ================= HERO ================= */}
      <section className="relative">
        <div className="absolute inset-0 h-[420px]">
          {course.thumbnail ? (
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600" />
          )}
          <div className="absolute inset-0 bg-black/65" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-24 text-white">
          <button
            onClick={() => navigate("/learning")}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-6"
          >
            <ArrowLeft size={18} /> Back to Courses
          </button>

          {isAdmin && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute top-8 right-6 flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg hover:bg-white/20"
            >
              <Edit size={16} /> Edit
            </button>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-3 mb-4">
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm">
              {course.category}
            </span>
            <span className="px-3 py-1 bg-white/10 rounded-full text-sm">
              {course.level}
            </span>
            {!hasAccess && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-sm flex items-center gap-1">
                <Lock size={12} /> Enrollment Required
              </span>
            )}
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold max-w-4xl">
            {course.title}
          </h1>

          {/* INFO BAR */}
          <div className="flex flex-wrap gap-4 mt-6 items-center">
            <InfoPill>
              <User size={16} />
              <span>
                Instructor:{" "}
                <strong>{course.instructor || "EduHackTech"}</strong>
              </span>
            </InfoPill>

            <InfoPill>
              <Star className="text-yellow-400 fill-yellow-400" size={16} />
              <span>{course.rating ? course.rating.toFixed(1) : "New"}</span>
            </InfoPill>

            <InfoPill>
              <Clock size={16} />
              <span>{course.duration || "Self-paced"}</span>
            </InfoPill>

            <InfoPill>
              <Layers size={16} />
              <span>{content?.modules?.length || 0} Modules</span>
            </InfoPill>
          </div>

          {/* DESCRIPTION */}
          <div className="mt-6 max-w-4xl">
            <p className="text-white/85 text-lg leading-relaxed max-h-28 overflow-y-auto pr-2">
              {course.description}
            </p>
          </div>

          {course.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {course.tags.map((tag, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-sm"
                >
                  <Tag size={12} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= CONTENT ================= */}
      <section className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-3 gap-10">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-8">
          {/* Preview */}
          <div className="bg-slate-900 rounded-2xl h-[360px] flex items-center justify-center text-white relative overflow-hidden shadow-xl">
            {course.thumbnail && (
              <img
                src={course.thumbnail}
                alt="Preview"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
            )}
            <div className="relative text-center">
              {hasAccess ? (
                <PlayCircle className="w-20 h-20 mx-auto hover:scale-110 transition" />
              ) : (
                <>
                  <Lock className="w-16 h-16 mx-auto mb-4 opacity-60" />
                  <p className="text-white/70">Enroll to unlock lessons</p>
                </>
              )}
            </div>
          </div>

          {/* ===== PROGRESS BAR ===== */}
          {hasAccess && enrollment && (
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800">Your Progress</h3>
                <span className="text-sm font-medium text-blue-600">
                  {enrollment.progress || 0}%
                </span>
              </div>

              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                  style={{ width: `${enrollment.progress || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* MODULES PREVIEW */}
          {content?.modules?.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-8">
              <h2 className="text-xl font-bold mb-6">Course Modules</h2>

              <div className="space-y-3">
                {content.modules.map((module, i) => {
                  const completed = isModuleCompleted(module);

                  return (
                    <button
                      key={i}
                      onClick={() => {
                        if (!hasAccess) return;
                        navigate(`/course/${id}/learn`);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition
                        ${hasAccess
                          ? "hover:bg-gray-50"
                          : "opacity-60 cursor-not-allowed"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold
                            ${completed
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                            }`}
                        >
                          {completed ? "✓" : i + 1}
                        </div>

                        <div className="text-left">
                          <p className="font-medium">
                            Module {i + 1}: {module.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {module.lessons.length} lessons
                          </p>
                        </div>
                      </div>

                      {completed ? (
                        <CheckCircle className="text-green-500" size={20} />
                      ) : hasAccess ? (
                        <PlayCircle size={20} className="text-blue-500" />
                      ) : (
                        <Lock size={18} className="text-gray-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT ENROLL CARD */}
        <div className="bg-white rounded-2xl shadow p-6 h-fit sticky top-24">
          <h3 className="text-3xl font-bold mb-2">
            {course.price > 0 ? `₹${course.price}` : "Free"}
          </h3>
          <p className="text-gray-500 text-sm mb-6">Full lifetime access</p>

          {!user ? (
            <button
              onClick={() => navigate("/login")}
              className="w-full py-4 rounded-xl bg-gray-900 text-white font-bold hover:bg-black"
            >
              <LogIn className="inline mr-2" size={18} />
              Login to Enroll
            </button>
          ) : hasAccess ? (
            <button
              onClick={() => navigate(`/course/${id}/learn`)}
              className="w-full py-4 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700"
            >
              Continue Learning
            </button>
          ) : (
            <button
              onClick={() => navigate(`/payment/${id}`)}
              className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg"
            >
              Enroll Now
            </button>
          )}

          <p className="text-xs text-gray-500 mt-4 text-center">
            {course.refundWindowDays || 30}-day money-back guarantee
          </p>

          {enrollment && refundEligibility && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex flex-col gap-3">
                {refundEligibility.daysRemaining > 0 && !['pending', 'approved', 'rejected'].includes(enrollment.refundStatus) && (
                  <div className="bg-blue-50 text-blue-700 p-3 rounded-xl text-center text-sm font-medium">
                    {refundEligibility.daysRemaining} days left for refund eligibility
                  </div>
                )}

                {refundEligibility.isEligible && enrollment.progress === 100 && (
                  <button
                    onClick={handleRequestRefund}
                    disabled={requestingRefund}
                    className="w-full py-3 rounded-xl border-2 border-red-100 text-red-600 font-bold hover:bg-red-50 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {requestingRefund ? <Loader2 className="animate-spin" size={18} /> : "Request Refund"}
                  </button>
                )}

                {enrollment.refundStatus && enrollment.refundStatus !== 'none' && (
                  <div className={`p-3 rounded-xl text-center text-sm font-bold capitalize
                    ${enrollment.refundStatus === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                      enrollment.refundStatus === 'approved' ? 'bg-green-50 text-green-700' :
                        'bg-red-50 text-red-700'}`}
                  >
                    Refund Status: {enrollment.refundStatus}
                  </div>
                )}

                {!refundEligibility.isEligible && enrollment.progress === 100 && enrollment.refundStatus === 'none' && (
                  <p className="text-xs text-center text-gray-400">
                    {refundEligibility.reason || "Not eligible for refund"}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <CourseEditModal
        course={course}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={(c) => setCourse(c)}
      />
    </div>
  );
};

const InfoPill = ({ children }) => (
  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm backdrop-blur">
    {children}
  </div>
);

export default CoursePage;
