-- Tambah compound index untuk optimasi query expense
-- AMAN: Hanya CREATE INDEX, tidak mengubah/menghapus data apapun
--
-- Cara pakai di phpMyAdmin:
-- 1. Buka phpMyAdmin > pilih database production-app
-- 2. Klik tab "SQL"
-- 3. Copy-paste semua isi file ini
-- 4. Klik "Go" / "Execute"

-- Index untuk query: WHERE userId = ? AND date BETWEEN ? AND ?
-- Dipakai oleh: getExpenses()
CREATE INDEX idx_expense_user_date ON Expense(userId, date);

-- Index untuk query: WHERE date BETWEEN ? AND ?
-- Dipakai oleh: getAllExpenses(), getAllExpensesForYear()
CREATE INDEX idx_expense_date ON Expense(date);
