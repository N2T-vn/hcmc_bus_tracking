# Database

Tập tin CSV lớn `bus_waypoints.csv` đã được loại khỏi kho mã vì vượt quá giới hạn của GitHub (100 MB).

Nếu bạn cần dữ liệu này, có các lựa chọn:

1. Sử dụng Git LFS (đề xuất):

   ```bash
   git lfs install
   git lfs track "database/bus_waypoints.csv"
   git add .gitattributes
   git add database/bus_waypoints.csv
   git commit -m "Add database/bus_waypoints.csv via Git LFS"
   git push
   ```

2. Hoặc lưu file ở nơi khác (Google Drive / Dropbox / internal file server) và thêm link tải ở đây. Ví dụ:

   - Tải lên Drive/Dropbox → Chia sẻ link → Cập nhật file này với link tải.

3. Nếu muốn tôi giúp upload vào Git LFS hoặc hướng dẫn chia nhỏ/nén file, hãy cho biết lựa chọn.

---

Vui lòng không thêm lại file CSV thẳng vào repo (kích thước >100MB) nếu không dùng Git LFS.
