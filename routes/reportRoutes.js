const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// PDF
router.get("/download-sales-report/pdf", authController.downloadSalesReportPDF);

// CSV
router.get("/download-sales-report/csv", authController.downloadSalesReportCSV);

// Excel
router.get("/download-sales-report/excel", authController.downloadSalesReportExcel);

module.exports = router;
