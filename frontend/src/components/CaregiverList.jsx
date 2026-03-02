import React, { useState, useEffect } from 'react';
import { UserPlus, Heart, Mail, Trash2, Users, Shield, CheckCircle, Clock } from 'lucide-react';
import AddCaregiverModal from './AddCaregiverModal';
import { getMyCaregivers, deleteCaregiver } from '../api';

// Deterministic avatar color based on name
const avatarColors = [
  ['from-violet-400 to-purple-500',  'bg-violet-50  text-violet-700'],
  ['from-rose-400   to-pink-500',    'bg-rose-50    text-rose-700'],
  ['from-amber-400  to-orange-500',  'bg-amber-50   text-amber-700'],
  ['from-teal-400   to-emerald-500', 'bg-teal-50    text-teal-700'],
  ['from-blue-400   to-indigo-500',  'bg-blue-50    text-blue-700'],
  ['from-fuchsia-400 to-pink-500',   'bg-fuchsia-50 text-fuchsia-700'],
];
const getColor = (name = '') => avatarColors[name.charCodeAt(0) % avatarColors.length];

const StatusBadge = ({ status }) => {
  const map = {
    Active:  { icon: <CheckCircle size={11} />, label: 'Connected',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    Pending: { icon: <Clock       size={11} />, label: 'Pending Approval',   cls: 'bg-amber-50   text-amber-700   border-amber-200'   },
    Invited: { icon: <Mail        size={11} />, label: 'Awaiting Sign-up',   cls: 'bg-blue-50    text-blue-700    border-blue-200'    },
  };
  const s = map[status] || map.Pending;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
};

const MemberCard = ({ member, onDelete }) => {
  const initial = member.isEmailOnly ? '✉' : (member.name?.charAt(0)?.toUpperCase() || '?');
  const [grad, pill] = getColor(member.name || member.email || '');

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100 hover:border-rose-200 transition-all duration-300 hover:-translate-y-0.5 overflow-hidden">
      {/* top accent bar */}
      <div className={`h-1 w-full bg-gradient-to-r ${grad}`} />

      <div className="p-5">
        {/* Avatar + remove */}
        <div className="flex justify-between items-start mb-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-xl font-black shadow-md`}>
            {member.isEmailOnly ? '✉️' : initial}
          </div>
          <button
            onClick={() => onDelete(member.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all"
            title="Remove"
          >
            <Trash2 size={15} />
          </button>
        </div>

        {/* Name + relationship */}
        <p className="font-black text-gray-800 text-sm truncate leading-tight">
          {member.isEmailOnly ? 'Invited Member' : (member.name || 'Unknown')}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{member.email}</p>

        <div className="mt-2">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pill}`}>
            {member.relationship || 'Family Member'}
          </span>
        </div>

        {/* Status + mail */}
        <div className="mt-3 flex items-center justify-between">
          <StatusBadge status={member.isEmailOnly ? 'Invited' : member.status} />
          <button
            onClick={() => window.location.href = `mailto:${member.email}`}
            className="p-1.5 rounded-xl hover:bg-indigo-50 text-gray-300 hover:text-indigo-500 transition-colors"
            title="Send email"
          >
            <Mail size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const CaregiverList = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchFamilyMembers = async () => {
        setLoading(true);
        try {
            const res = await getMyCaregivers();
            setFamilyMembers(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch family members", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFamilyMembers(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this family member from your circle?")) return;
        try {
            await deleteCaregiver(id);
            fetchFamilyMembers();
        } catch (error) {
            console.error("Failed to remove family member", error);
        }
    };

    const active  = familyMembers.filter(m => m.status === 'Active');
    const pending = familyMembers.filter(m => m.status !== 'Active');

    return (
        <>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-black text-rose-600 flex items-center gap-2">
                        <Heart size={22} className="fill-rose-100" />
                        My Family Circle
                    </h2>
                    <p className="text-xs text-gray-400 mt-0.5 ml-8">
                        {active.length} connected · {pending.length} pending
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 text-sm bg-gradient-to-r from-rose-500 to-pink-500 text-white px-4 py-2 rounded-xl font-bold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                >
                    <UserPlus size={15} />
                    Add Family
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-100 border-t-rose-500" />
                </div>
            ) : familyMembers.length === 0 ? (
                <div className="text-center py-14 bg-rose-50/40 rounded-2xl border-2 border-dashed border-rose-200">
                    <Users className="mx-auto mb-3 text-rose-300" size={40} />
                    <p className="font-bold text-rose-500">No family members yet</p>
                    <p className="text-xs text-gray-400 mt-1">Invite someone to join your health circle!</p>
                </div>
            ) : (
                <>
                    {/* Connected members */}
                    {active.length > 0 && (
                        <div className="mb-6">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Shield size={12} className="text-emerald-400" /> Connected
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {active.map(m => (
                                    <MemberCard key={m.id} member={m} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending / invited */}
                    {pending.length > 0 && (
                        <div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Clock size={12} className="text-amber-400" /> Pending
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {pending.map(m => (
                                    <MemberCard key={m.id} member={m} onDelete={handleDelete} />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <AddCaregiverModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchFamilyMembers}
            />
        </>
    );
};

export default CaregiverList;
