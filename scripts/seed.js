require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const connectDB = require("../src/config/db");
const Department = require("../src/models/Department");

const departments = [
  {
    name: "Human Resources Management",
    code: "HRM",
    description:
      "Manages employee relations, recruitment, onboarding, and staff development programmes.",
    isActive: true,
  },
  {
    name: "Information Technology",
    code: "IT",
    description:
      "Responsible for software engineering, infrastructure management, and technical support services.",
    isActive: true,
  },
  {
    name: "Finance & Accounting ",
    code: "FIN",
    description:
      "Oversees budgeting, financial reporting, payroll processing, and fiscal compliance.",
    isActive: true,
  },
  {
    name: "Logistics and Supply Chain",
    code: "LSC",
    description:
      "Handles brand strategy, digital campaigns, public relations, and alumni outreach.",
    isActive: true,
  },
  {
    name: "Community Development",
    code: "CD",
    description:
      "Coordinates academic programmes, curriculum development, and faculty administration.",
    isActive: true,
  },
  {
    name: "Health Systems Management",
    code: "HSM",
    description:
      "Supports student welfare, career guidance, counselling, and extracurricular activities.",
    isActive: true,
  },
  {
    name: "Marketing and Communication",
    code: "MKT",
    description:
      "Leads innovation, applied research initiatives, and partnerships with industry stakeholders.",
    isActive: true,
  },
  {
    name: "Business Administration",
    code: "ABMA",
    description:
      "Manages office operations, executive support, and general institutional administration.",
    isActive: true,
  },
];

const seedDepartments = async () => {
  await connectDB();

  console.log("\n Starting Department seed...\n");

  let inserted = 0;
  let skipped = 0;

  for (const data of departments) {
    const exists = await Department.findOne({ code: data.code });

    if (exists) {
      console.log(`⏭  Skipped  [${data.code}] ${data.name} — already exists`);
      skipped++;
    } else {
      await Department.create(data);
      console.log(` Inserted [${data.code}] ${data.name}`);
      inserted++;
    }
  }

  console.log(`\nDone — ${inserted} inserted, ${skipped} skipped.\n`);
  process.exit(0);
};

seedDepartments().catch((err) => {
  console.error(" Seed failed:", err.message);
  process.exit(1);
});
