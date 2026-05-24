import { useState, useEffect, useCallback } from 'react';
import { roomsApi } from '../api';
import RoomCard from '../components/RoomCard';

const EMPTY_FORM = {
  name: '', code: '', location: '', floor: '',
  capacity: '', is_vip: false, amenities: '',
};

export default function AdminPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roomsApi.getAll();
      setRooms(res.data.data.rooms || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const openCreate = () => {
    setEditRoom(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (room) => {
    setEditRoom(room);
    setForm({
      name: room.name,
      code: room.code,
      location: room.location,
      floor: room.floor,
      capacity: room.capacity,
      is_vip: room.is_vip,
      amenities: (room.amenities || []).map((a) => a.name).join(', '),
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        amenities: form.amenities
          ? form.amenities.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      if (editRoom) {
        await roomsApi.update(editRoom.id, payload);
      } else {
        await roomsApi.create(payload);
      }
      setShowForm(false);
      loadRooms();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Xóa phòng "${name}"?`)) return;
    try {
      await roomsApi.delete(id);
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Không thể xóa');
    }
  };

  const filtered = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.location?.toLowerCase().includes(search.toLowerCase()) ||
      r.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý phòng họp</h1>
          <p className="text-gray-500 mt-1">{rooms.length} phòng</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + Thêm phòng mới
        </button>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-sm"
          placeholder="🔍 Tìm theo tên, địa điểm, mã..."
        />
      </div>

      {/* Rooms grid */}
      {loading ? (
        <div className="card p-12 text-center text-gray-400">Đang tải...</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((room) => (
            <div key={room.id} className="relative">
              <RoomCard room={room} />
              <div className="flex gap-2 px-5 pb-5 -mt-1">
                <button
                  onClick={() => openEdit(room)}
                  className="btn-secondary flex-1 text-sm py-2"
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => handleDelete(room.id, room.name)}
                  className="text-sm text-red-500 hover:text-white hover:bg-red-500 border border-red-200 px-4 py-2 rounded-lg transition-all duration-200"
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                {editRoom ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng *</label>
                  <input
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Phòng họp A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã phòng *</label>
                  <input
                    className="input-field"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                    placeholder="HQ-3F-A"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sức chứa *</label>
                  <input
                    type="number"
                    min="1"
                    className="input-field"
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                    required
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm *</label>
                  <input
                    className="input-field"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    required
                    placeholder="Trụ sở HCM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tầng *</label>
                  <input
                    className="input-field"
                    value={form.floor}
                    onChange={(e) => setForm({ ...form, floor: e.target.value })}
                    required
                    placeholder="3F"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiện ích (ngăn cách bởi dấu phẩy)</label>
                  <input
                    className="input-field"
                    value={form.amenities}
                    onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                    placeholder="TV, Projector, Whiteboard"
                  />
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_vip}
                      onChange={(e) => setForm({ ...form, is_vip: e.target.checked })}
                      className="w-4 h-4 accent-ghn-orange"
                    />
                    <span className="text-sm font-medium text-gray-700">Phòng VIP (chỉ admin/VIP mới được đặt)</span>
                  </label>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Đang lưu...' : editRoom ? 'Cập nhật' : 'Tạo phòng'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-6">
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
