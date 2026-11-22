require("dotenv").config();

const { MongoClient } = require("mongodb");

const samples = [
  ["AC Repair", "Split AC servicing", "Complete split AC inspection, cleaning and servicing.", 1500, "Dhanmondi, Dhaka"],
  ["AC Repair", "AC installation", "Professional home AC installation and setup.", 2500, "Uttara, Dhaka"],
  ["AC Repair", "AC gas refill", "AC cooling diagnosis and gas refill service.", 2200, "Mirpur, Dhaka"],
  ["Refrigerator Repair", "Fridge cooling repair", "Diagnosis and repair of refrigerator cooling problems.", 1800, "Mohammadpur, Dhaka"],
  ["Refrigerator Repair", "Refrigerator maintenance", "General refrigerator maintenance and inspection.", 1200, "Uttara, Dhaka"],
  ["Refrigerator Repair", "Freezer repair", "Freezer temperature and compressor troubleshooting.", 2000, "Dhanmondi, Dhaka"],
  ["Washing Machine", "Washing machine repair", "Repair for common washing machine faults.", 1600, "Mirpur, Dhaka"],
  ["Washing Machine", "Washer installation", "Washing machine installation and setup.", 1000, "Bashundhara, Dhaka"],
  ["Washing Machine", "Drainage problem repair", "Inspection and repair of washer drainage issues.", 1300, "Uttara, Dhaka"],
  ["Computer Repair", "Laptop troubleshooting", "Laptop diagnosis and hardware troubleshooting.", 1000, "Dhanmondi, Dhaka"],
  ["Computer Repair", "Desktop repair", "Desktop computer repair and maintenance.", 1400, "Mirpur, Dhaka"],
  ["Television Repair", "LED TV diagnosis", "LED television diagnosis and repair service.", 1700, "Mohammadpur, Dhaka"],
];

async function seed() {
  const client = new MongoClient(process.env.MONGODB_URI);

  try {
    await client.connect();

    const db = client.db(process.env.DB_NAME || "fixmate");
    const users = db.collection("users");
    const services = db.collection("services");

    const technician = await users.findOne({ role: "technician" });

    if (!technician) {
      console.log("No technician account found.");
      console.log("Register a technician account first, then run this script again.");
      return;
    }

    const technicianId = String(technician.id || technician._id);

    const existing = await services.countDocuments({
      seedTag: "fixmate-demo-v1",
    });

    if (existing > 0) {
      console.log("Demo services already exist. No duplicates added.");
      return;
    }

    const documents = samples.map((item) => ({
      category: item[0],
      title: item[1],
      description: item[2],
      price: item[3],
      area: item[4],
      technicianId,
      technicianName: technician.name || "FixMate Technician",
      status: "approved",
      availability: "available",
      seedTag: "fixmate-demo-v1",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await services.insertMany(documents);

    console.log(`${result.insertedCount} demo services added successfully.`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seed();
