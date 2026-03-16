// GxP Portal - Default Data
// All data is stored here and can be overridden by localStorage

const DEFAULT_GROUPS = ["QA", "Kho", "Development"];

const DEFAULT_ADMIN_PASSWORD = "admin123";

const DEFAULT_ITEMS = [
  // ── ROOT LEVEL LINKS ──────────────────────────────────────────────────
  {
    id: "item-infor",
    type: "link",
    title: "INFOR",
    description: "Quản lý tồn kho, HOLD hàng, check ASN, LPN",
    url: "https://www.infor.com/",
    thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80",
    groups: ["QA", "Kho"],
    status: "live",
    order: 1,
    parentId: null,
    content: ""
  },
  {
    id: "item-qctool",
    type: "link",
    title: "QC Tool ver. 2",
    description: "Tạo biên bản kiểm nhập, lưu hình ảnh, duyệt phiếu",
    url: "https://docs.google.com/",
    thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80",
    groups: ["QA"],
    status: "live",
    order: 2,
    parentId: null,
    content: ""
  },
  {
    id: "item-ticket",
    type: "link",
    title: "TICKET",
    description: "Liên quan case khiếu nại, xin COA... (CS, Plan)",
    url: "https://docs.google.com/",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&q=80",
    groups: ["QA"],
    status: "live",
    order: 3,
    parentId: null,
    content: ""
  },
  {
    id: "item-bbsc",
    type: "link",
    title: "BBSC Tool",
    description: "Quản lý sự cố hàng hóa",
    url: "https://docs.google.com/",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80",
    groups: ["QA", "Kho"],
    status: "live",
    order: 4,
    parentId: null,
    content: ""
  },
  {
    id: "item-task",
    type: "note",
    title: "TASK",
    description: "Ghi nhớ tác vụ (cá nhân hóa)",
    url: "",
    thumbnail: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&q=80",
    groups: ["QA"],
    status: "testing",
    order: 5,
    parentId: null,
    content: "<h3>📋 Task cá nhân</h3><p>Ghi chú công việc hàng ngày của bạn tại đây.</p><table border='1' cellpadding='8' cellspacing='0' style='width:100%;border-collapse:collapse'><tr style='background:#1a7a6e;color:white'><th>STT</th><th>Nội dung</th><th>Deadline</th><th>Trạng thái</th></tr><tr><td>1</td><td>Kiểm tra hàng nhập kho</td><td>12/03/2026</td><td>✅ Xong</td></tr><tr><td>2</td><td>Duyệt biên bản QC</td><td>13/03/2026</td><td>⏳ Đang làm</td></tr></table>"
  },
  // ── FOLDERS ────────────────────────────────────────────────────────────
  {
    id: "folder-tool-qa",
    type: "folder",
    title: "Tool hỗ trợ (QA)",
    description: "Hỗ trợ công việc hàng ngày, QA phát triển",
    url: "",
    thumbnail: "",
    groups: ["QA"],
    status: "live",
    order: 6,
    parentId: null,
    content: ""
  },
  {
    id: "folder-app-cty",
    type: "folder",
    title: "App Công Ty",
    description: "QC Tool v1, Bảo TEST, E-Office",
    url: "",
    thumbnail: "",
    groups: ["QA", "Kho"],
    status: "live",
    order: 7,
    parentId: null,
    content: ""
  },
  {
    id: "folder-tracuu-dav",
    type: "folder",
    title: "Tra cứu DAV",
    description: "Tra cứu Thuốc, TBYT",
    url: "",
    thumbnail: "",
    groups: ["QA", "Kho"],
    status: "live",
    order: 8,
    parentId: null,
    content: ""
  },
  {
    id: "folder-quy-dinh",
    type: "folder",
    title: "Tóm tắt quy định",
    description: "Nội bộ BI, hỏi đáp ngắn về SOP, TS, NB",
    url: "",
    thumbnail: "",
    groups: ["QA"],
    status: "testing",
    order: 9,
    parentId: null,
    content: ""
  },
  {
    id: "folder-dev-tools",
    type: "folder",
    title: "Tool In Development",
    description: "INFOR, QC Tool DEV",
    url: "",
    thumbnail: "",
    groups: ["Development"],
    status: "inactive",
    order: 10,
    parentId: null,
    content: ""
  },
  // ── CHILDREN of "Tool hỗ trợ (QA)" ─────────────────────────────────
  {
    id: "item-bbkn",
    type: "link",
    title: "BBKN Kho vs QA",
    description: "Tìm lỗi thầu BBKN của QA/ Kho (theo ASN)",
    url: "https://docs.google.com/",
    thumbnail: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&q=80",
    groups: ["QA", "Kho"],
    status: "live",
    order: 1,
    parentId: "folder-tool-qa",
    content: ""
  },
  {
    id: "item-check-lpn",
    type: "link",
    title: "Check LPN TBYT",
    description: "Xem có LPN nào lỗi không (chứa nhiều sản phẩm)",
    url: "https://docs.google.com/",
    thumbnail: "https://images.unsplash.com/photo-1576671081837-49000212a370?w=400&q=80",
    groups: ["QA"],
    status: "testing",
    order: 2,
    parentId: "folder-tool-qa",
    content: ""
  },
  {
    id: "item-matkhau",
    type: "note",
    title: "Mật khẩu công ty",
    description: "Bấm để xem chi tiết",
    url: "",
    thumbnail: "",
    groups: ["QA"],
    status: "testing",
    order: 3,
    parentId: "folder-tool-qa",
    content: "<h3>🔐 Mật khẩu hệ thống</h3><p><em>Nội dung bảo mật - chỉ hiển thị cho QA</em></p><table border='1' cellpadding='8' cellspacing='0' style='width:100%;border-collapse:collapse'><tr style='background:#1a7a6e;color:white'><th>Hệ thống</th><th>Tài khoản</th><th>Mật khẩu</th></tr><tr><td>INFOR WMS</td><td>qa_user</td><td>••••••••</td></tr><tr><td>QC Tool</td><td>qc_admin</td><td>••••••••</td></tr></table>"
  },
  // ── CHILDREN of "App Công Ty" ──────────────────────────────────────
  {
    id: "item-eoffice",
    type: "link",
    title: "E-Office",
    description: "Hệ thống văn phòng điện tử",
    url: "https://docs.google.com/",
    thumbnail: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80",
    groups: ["QA", "Kho"],
    status: "live",
    order: 1,
    parentId: "folder-app-cty",
    content: ""
  },
  {
    id: "item-qctool-v1",
    type: "link",
    title: "QC Tool v1",
    description: "Phiên bản cũ, vẫn đang dùng song song",
    url: "https://docs.google.com/",
    thumbnail: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=80",
    groups: ["QA"],
    status: "live",
    order: 2,
    parentId: "folder-app-cty",
    content: ""
  },
  // ── CHILDREN of "Tra cứu DAV" ──────────────────────────────────────
  {
    id: "item-tracuu-thuoc",
    type: "link",
    title: "Tra cứu Thuốc",
    description: "Cổng thông tin dược phẩm DAV",
    url: "https://dav.gov.vn/",
    thumbnail: "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=400&q=80",
    groups: ["QA", "Kho"],
    status: "live",
    order: 1,
    parentId: "folder-tracuu-dav",
    content: ""
  },
  {
    id: "item-tracuu-tbyt",
    type: "link",
    title: "Tra cứu TBYT",
    description: "Thiết bị y tế đăng ký lưu hành",
    url: "https://dav.gov.vn/",
    thumbnail: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&q=80",
    groups: ["QA", "Kho"],
    status: "live",
    order: 2,
    parentId: "folder-tracuu-dav",
    content: ""
  }
];

// Export for use
if (typeof module !== 'undefined') {
  module.exports = { DEFAULT_GROUPS, DEFAULT_ITEMS, DEFAULT_ADMIN_PASSWORD };
}
