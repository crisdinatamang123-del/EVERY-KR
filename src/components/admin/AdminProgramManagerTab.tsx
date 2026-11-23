import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Save,
  BookOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AdminManagedProgramRecord } from '../../types';
import {
  fetchAdminManagedProgramsDoc,
  saveAdminManagedProgramDoc,
  deleteAdminManagedProgramDoc
} from '../../services/firebaseService';

export const AdminProgramManagerTab: React.FC = () => {
  const { currentUser, universitiesList, approvedUniversitiesList, showToast } = useApp();

  const universities = useMemo(
    () =>
      approvedUniversitiesList && approvedUniversitiesList.length > 0
        ? approvedUniversitiesList
        : universitiesList,
    [approvedUniversitiesList, universitiesList]
  );

  const [programs, setPrograms] = useState<AdminManagedProgramRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUniversityId, setFilterUniversityId] = useState('ALL');
  const [filterDegree, setFilterDegree] = useState('ALL');
  const [editingProgram, setEditingProgram] = useState<AdminManagedProgramRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const loadPrograms = async () => {
    const fetched = await fetchAdminManagedProgramsDoc();
    if (fetched.length > 0) {
      setPrograms(fetched);
    } else {
      // Seed initial structured programs from approved universities so Admin can immediately view/edit/link
      const seeded: AdminManagedProgramRecord[] = universities.slice(0, 12).flatMap((u, idx) =>
        (u.programs || ['Computer Science & Engineering', 'Global Business Administration'])
          .slice(0, 2)
          .map((pName, pIdx) => ({
            id: `seed_prog_${u.id}_${pIdx}`,
            universityId: u.id,
            universityName: u.name,
            programName: pName,
            department: pIdx === 0 ? 'College of Engineering' : 'School of Business',
            degreeLevel: idx % 3 === 0 ? 'Master' : 'Bachelor',
            languageOfInstruction: u.englishTaughtAvailable ? 'English' : 'Korean',
            tuitionPerSemesterKRW: u.tuitionPerSemesterKRW?.min || 4200000,
            applicationFeeKRW: u.applicationFeeKrw || 100000,
            admissionRequirements:
              u.admissionRequirements?.minimumGpa || 'High School / Bachelor Diploma & Official Transcripts',
            languageRequirements:
              u.admissionRequirements?.topikLevel || 'TOPIK Level 3+ or IELTS 5.5+',
            availableIntakes: ['Spring (March)', 'Fall (September)'],
            applicationDeadline: u.deadlines?.springSemester || '2026-11-30',
            published: true,
            updatedAt: new Date().toISOString()
          }))
      );
      setPrograms(seeded);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  const filteredPrograms = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return programs.filter(p => {
      if (filterUniversityId !== 'ALL' && p.universityId !== filterUniversityId) return false;
      if (filterDegree !== 'ALL' && p.degreeLevel !== filterDegree) return false;
      if (!q) return true;
      return (
        p.programName.toLowerCase().includes(q) ||
        p.universityName.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      );
    });
  }, [programs, searchQuery, filterUniversityId, filterDegree]);

  const openCreateModal = () => {
    const firstUni = universities[0];
    setEditingProgram({
      id: '',
      universityId: firstUni?.id || 'yonsei',
      universityName: firstUni?.name || 'Yonsei University',
      programName: '',
      department: 'College of Global Studies',
      degreeLevel: 'Bachelor',
      languageOfInstruction: 'English',
      tuitionPerSemesterKRW: 4200000,
      applicationFeeKRW: 100000,
      admissionRequirements: 'Academic Certificates, Official Transcripts & Passport Copy',
      languageRequirements: 'IELTS 5.5+ / TOEFL 71+ or TOPIK Level 3+',
      availableIntakes: ['Spring (March)', 'Fall (September)'],
      applicationDeadline: '2026-11-30',
      published: true,
      updatedAt: new Date().toISOString()
    });
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram || !currentUser) return;
    if (!editingProgram.programName.trim()) {
      showToast('Program name is required.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveAdminManagedProgramDoc({
        program: editingProgram,
        adminUid: currentUser.id,
        adminName: currentUser.fullName || currentUser.name || 'Admin',
        adminEmail: currentUser.email
      });
      setPrograms(prev => {
        const exists = prev.some(p => p.id === saved.id);
        return exists ? prev.map(p => (p.id === saved.id ? saved : p)) : [saved, ...prev];
      });
      setEditingProgram(null);
      showToast(`Saved program "${saved.programName}" (${saved.universityName})`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProgram = async (prog: AdminManagedProgramRecord) => {
    if (!currentUser) return;
    await deleteAdminManagedProgramDoc({
      programId: prog.id,
      programName: prog.programName,
      adminUid: currentUser.id,
      adminName: currentUser.fullName || currentUser.name || 'Admin',
      adminEmail: currentUser.email
    });
    setPrograms(prev => prev.filter(p => p.id !== prog.id));
    showToast(`Deleted program "${prog.programName}"`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-[#10243A] dark:text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#19B6A4]" />
              University Program Management ({filteredPrograms.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Create, edit, and link degree programs to Korean universities with KRW tuition fees, admission &amp; language requirements, and intake availability.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#10243A] hover:bg-[#1769AA] text-white text-xs font-bold self-start"
          >
            <Plus className="w-4 h-4" />
            Create Program
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search program, department, university..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={filterUniversityId}
            onChange={e => setFilterUniversityId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">All Universities</option>
            {universities.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={filterDegree}
            onChange={e => setFilterDegree(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
          >
            <option value="ALL">All Degree Levels</option>
            <option value="Language Program">Language Program (D-4)</option>
            <option value="Associate">Associate</option>
            <option value="Bachelor">Bachelor</option>
            <option value="Master">Master</option>
            <option value="PhD">PhD</option>
          </select>
        </div>
      </div>

      {/* Programs Table */}
      <div className="bg-white dark:bg-[#10243A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold">
              <tr>
                <th className="p-4">Program &amp; Department</th>
                <th className="p-4">Linked University</th>
                <th className="p-4">Degree &amp; Medium</th>
                <th className="p-4">Tuition / Sem (KRW)</th>
                <th className="p-4">Language Req.</th>
                <th className="p-4">Intakes</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPrograms.map(prog => (
                <tr key={prog.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="p-4">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {prog.programName}
                    </div>
                    <div className="text-[11px] text-slate-500">{prog.department}</div>
                  </td>
                  <td className="p-4 font-semibold text-[#10243A] dark:text-slate-200">
                    {prog.universityName}
                  </td>
                  <td className="p-4">
                    <span className="font-bold">{prog.degreeLevel}</span>
                    <span className="text-slate-400"> • {prog.languageOfInstruction}</span>
                  </td>
                  <td className="p-4 font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    ₩{Number(prog.tuitionPerSemesterKRW || 0).toLocaleString()}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                    {prog.languageRequirements}
                  </td>
                  <td className="p-4 text-slate-600 dark:text-slate-300">
                    {(prog.availableIntakes || []).join(', ')}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingProgram(prog)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProgram(prog)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Program Modal */}
      {editingProgram && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProgram}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full overflow-hidden shadow-2xl my-8"
          >
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingProgram.id ? 'Edit University Program' : 'Create University Program'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingProgram(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[72vh] overflow-y-auto text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Linked University *
                </label>
                <select
                  value={editingProgram.universityId}
                  onChange={e => {
                    const uni = universities.find(u => u.id === e.target.value);
                    setEditingProgram({
                      ...editingProgram,
                      universityId: e.target.value,
                      universityName: uni?.name || editingProgram.universityName
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {universities.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Program Name *
                </label>
                <input
                  type="text"
                  required
                  value={editingProgram.programName}
                  onChange={e =>
                    setEditingProgram({ ...editingProgram, programName: e.target.value })
                  }
                  placeholder="e.g., Artificial Intelligence & Data Science"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  College / Department
                </label>
                <input
                  type="text"
                  value={editingProgram.department}
                  onChange={e =>
                    setEditingProgram({ ...editingProgram, department: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Degree Level
                </label>
                <select
                  value={editingProgram.degreeLevel}
                  onChange={e =>
                    setEditingProgram({ ...editingProgram, degreeLevel: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Language Program">Language Program (D-4)</option>
                  <option value="Associate">Associate</option>
                  <option value="Bachelor">Bachelor</option>
                  <option value="Master">Master</option>
                  <option value="PhD">PhD</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Language of Instruction
                </label>
                <select
                  value={editingProgram.languageOfInstruction}
                  onChange={e =>
                    setEditingProgram({
                      ...editingProgram,
                      languageOfInstruction: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="English">English</option>
                  <option value="Korean">Korean</option>
                  <option value="English & Korean">English &amp; Korean</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tuition Fee per Semester (KRW)
                </label>
                <input
                  type="number"
                  value={editingProgram.tuitionPerSemesterKRW}
                  onChange={e =>
                    setEditingProgram({
                      ...editingProgram,
                      tuitionPerSemesterKRW: Number(e.target.value || 0)
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Application Deadline
                </label>
                <input
                  type="text"
                  value={editingProgram.applicationDeadline || ''}
                  onChange={e =>
                    setEditingProgram({
                      ...editingProgram,
                      applicationDeadline: e.target.value
                    })
                  }
                  placeholder="2026-11-30"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Language Requirements
                </label>
                <input
                  type="text"
                  value={editingProgram.languageRequirements}
                  onChange={e =>
                    setEditingProgram({
                      ...editingProgram,
                      languageRequirements: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Admission Requirements
                </label>
                <textarea
                  rows={2}
                  value={editingProgram.admissionRequirements}
                  onChange={e =>
                    setEditingProgram({
                      ...editingProgram,
                      admissionRequirements: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingProgram(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : 'Save Program'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
