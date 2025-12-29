import { useEffect, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Calendar as CalendarIcon } from "lucide-react";

interface Holiday {
  id: string;
  date: string; // ISO date string
  name: string;
  type: 'national' | 'joint_leave';
  emoji?: string | null;
  year: number;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const Holidays = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    date: '',
    name: '',
    type: 'national' as 'national' | 'joint_leave',
    emoji: '',
  });
  const [yearFilter, setYearFilter] = useState(2026);

  useEffect(() => {
    loadHolidays();
  }, [yearFilter]);

  const loadHolidays = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('year', yearFilter)
        .order('date', { ascending: true });

      if (error) throw error;
      setHolidays(data || []);
    } catch (error) {
      console.error('Failed to load holidays:', error);
      toast({
        title: "Error",
        description: "Failed to load holidays. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (holiday?: Holiday) => {
    if (holiday) {
      setEditingHoliday(holiday);
      setFormData({
        date: holiday.date,
        name: holiday.name,
        type: holiday.type,
        emoji: holiday.emoji || '',
      });
    } else {
      setEditingHoliday(null);
      setFormData({
        date: '',
        name: '',
        type: 'national',
        emoji: '',
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingHoliday(null);
    setFormData({
      date: '',
      name: '',
      type: 'national',
      emoji: '',
    });
  };

  const handleSave = async () => {
    if (!formData.date || !formData.name) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      const date = new Date(formData.date);
      const year = date.getFullYear();
      const holidayData = {
        date: formData.date,
        name: formData.name,
        type: formData.type,
        emoji: formData.emoji || null,
        year,
      };

      if (editingHoliday) {
        const { error } = await supabase
          .from('holidays')
          .update(holidayData)
          .eq('id', editingHoliday.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Holiday updated successfully.",
        });
      } else {
        const { error } = await supabase
          .from('holidays')
          .insert(holidayData);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Holiday added successfully.",
        });
      }

      handleCloseDialog();
      loadHolidays();
    } catch (error: any) {
      console.error('Failed to save holiday:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save holiday. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Holiday deleted successfully.",
      });
      loadHolidays();
    } catch (error) {
      console.error('Failed to delete holiday:', error);
      toast({
        title: "Error",
        description: "Failed to delete holiday. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDateForTable = (date: Date) => {
    const day = date.getDate();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  };

  const nationalHolidays = holidays.filter(h => h.type === 'national');
  const jointLeave = holidays.filter(h => h.type === 'joint_leave');

  return (
    <Layout>
      <div className="container py-8 px-4 min-h-screen transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Holidays Management</h1>
            <p className="text-muted-foreground">Manage national holidays and joint leave days</p>
          </div>
          <div className="flex items-center gap-4">
            <Select value={String(yearFilter)} onValueChange={(v) => setYearFilter(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Holiday
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading holidays...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* National Holidays */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Hari Libur Nasional ({nationalHolidays.length})
              </h2>
              <div className="bg-card rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Tanggal</th>
                        <th className="text-left p-4 font-medium">Hari</th>
                        <th className="text-left p-4 font-medium">Keterangan</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nationalHolidays.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            No national holidays found for {yearFilter}
                          </td>
                        </tr>
                      ) : (
                        nationalHolidays.map((holiday) => {
                          const date = new Date(holiday.date);
                          const dayName = DAY_NAMES[date.getDay()];
                          return (
                            <tr key={holiday.id} className="border-b hover:bg-muted/50">
                              <td className="p-4">
                                {formatDateForTable(date)}
                              </td>
                              <td className="p-4">{dayName}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {holiday.emoji && <span>{holiday.emoji}</span>}
                                  <span>{holiday.name}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenDialog(holiday)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(holiday.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Joint Leave */}
            <div>
              <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5" />
                Cuti Bersama ({jointLeave.length})
              </h2>
              <div className="bg-card rounded-lg border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Tanggal</th>
                        <th className="text-left p-4 font-medium">Hari</th>
                        <th className="text-left p-4 font-medium">Keterangan</th>
                        <th className="text-right p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jointLeave.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            No joint leave days found for {yearFilter}
                          </td>
                        </tr>
                      ) : (
                        jointLeave.map((holiday) => {
                          const date = new Date(holiday.date);
                          const dayName = DAY_NAMES[date.getDay()];
                          return (
                            <tr key={holiday.id} className="border-b hover:bg-muted/50">
                              <td className="p-4">
                                {formatDateForTable(date)}
                              </td>
                              <td className="p-4">{dayName}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  {holiday.emoji && <span>{holiday.emoji}</span>}
                                  <span>{holiday.name}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenDialog(holiday)}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(holiday.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Date</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Name</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Holiday name"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Type</label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as 'national' | 'joint_leave' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">Hari Libur Nasional</SelectItem>
                    <SelectItem value="joint_leave">Cuti Bersama</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Emoji (Optional)</label>
                <Input
                  value={formData.emoji}
                  onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                  placeholder="🎉"
                  maxLength={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingHoliday ? 'Update' : 'Add'} Holiday
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Holidays;

