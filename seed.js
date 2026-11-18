import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI);

async function seedDatabase() {
  try {
    await client.connect();
    const db = client.db("fixmate");

    const usersCol = db.collection("user");
    const servicesCol = db.collection("services");
    const bookingsCol = db.collection("bookings");
    const paymentsCol = db.collection("payments");

    // Update profile metadata for the seeded accounts
    await usersCol.updateOne(
      { email: "tech1@fixmate.com" },
      {
        $set: {
          role: "technician",
          phone: "+880 1711-223344",
          area: "Dhanmondi, Dhaka",
          bio: "Certified smartphone, laptop, and micro-soldering specialist with 7+ years of experience.",
        },
      },
    );

    await usersCol.updateOne(
      { email: "tech2@fixmate.com" },
      {
        $set: {
          role: "technician",
          phone: "+880 1811-556677",
          area: "Uttara, Dhaka",
          bio: "Home appliance and HVAC technician specializing in split ACs, refrigerators, and washing machines.",
        },
      },
    );

    await usersCol.updateOne(
      { email: "customer@fixmate.com" },
      {
        $set: {
          role: "customer",
          phone: "+880 1911-889900",
          area: "Mirpur, Dhaka",
          bio: "Regular FixMate customer.",
        },
      },
    );

    // Clear old seed services/bookings/payments if re-running
    await servicesCol.deleteMany({
      technicianEmail: { $in: ["tech1@fixmate.com", "tech2@fixmate.com"] },
    });
    await bookingsCol.deleteMany({ customerEmail: "customer@fixmate.com" });
    await paymentsCol.deleteMany({ customerEmail: "customer@fixmate.com" });

    const now = new Date();

    // 14 Approved Services across all 7 categories
    const seedServices = [
      {
        title: "iPhone & Android OLED Screen Replacement",
        category: "Smartphone",
        description:
          "Original-grade OLED display replacement with True Tone calibration and 90-day warranty.",
        image:
          "https://images.unsplash.com/photo-1597740985671-2a8a3b80502e?auto=format&fit=crop&w=900&q=80",
        basePrice: 65,
        estimatedDuration: "1-2 hours",
        serviceMode: "Shop Drop-off",
        serviceArea: "Dhanmondi, Dhaka",
        technicianName: "Ariful Islam",
        technicianEmail: "tech1@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 13),
      },
      {
        title: "Smartphone Battery & Charging Port Repair",
        category: "Smartphone",
        description:
          "High-capacity battery replacement and USB-C / Lightning port micro-cleaning or replacement.",
        image:
          "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=900&q=80",
        basePrice: 30,
        estimatedDuration: "1 hour",
        serviceMode: "Home Visit",
        serviceArea: "Dhanmondi, Mirpur, Dhaka",
        technicianName: "Ariful Islam",
        technicianEmail: "tech1@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 12),
      },
      {
        title: "MacBook & Windows Laptop Deep Servicing",
        category: "Laptop & PC",
        description:
          "Complete dust removal, Thermal Grizzly repasting, fan lubrication, and OS optimization.",
        image:
          "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=80",
        basePrice: 40,
        estimatedDuration: "2-3 hours",
        serviceMode: "Home Visit",
        serviceArea: "Dhanmondi, Gulshan, Dhaka",
        technicianName: "Ariful Islam",
        technicianEmail: "tech1@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 11),
      },
      {
        title: "Laptop Keyboard, Hinge & SSD Upgrade",
        category: "Laptop & PC",
        description:
          "Broken hinge fabrication, backlit keyboard replacement, and NVMe SSD data migration.",
        image:
          "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80",
        basePrice: 55,
        estimatedDuration: "3-4 hours",
        serviceMode: "Shop Drop-off",
        serviceArea: "Dhanmondi, Dhaka",
        technicianName: "Ariful Islam",
        technicianEmail: "tech1@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10),
      },
      {
        title: "Split AC Master Jet Wash & Cooling Check",
        category: "AC",
        description:
          "High-pressure indoor/outdoor coil jet wash, drain pipe flushing, and cooling pressure check.",
        image:
          "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80",
        basePrice: 35,
        estimatedDuration: "1.5 hours",
        serviceMode: "Home Visit",
        serviceArea: "Uttara, Banani, Mirpur, Dhaka",
        technicianName: "Nusrat Jahan",
        technicianEmail: "tech2@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 9),
      },
      {
        title: "AC R32 / R410A Refrigerant Gas Refill",
        category: "AC",
        description:
          "Leak detection, vacuum purging, and full refrigerant gas top-up for inverter & non-inverter ACs.",
        image:
          "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=900&q=80",
        basePrice: 60,
        estimatedDuration: "2 hours",
        serviceMode: "Home Visit",
        serviceArea: "Uttara, Gulshan, Dhaka",
        technicianName: "Nusrat Jahan",
        technicianEmail: "tech2@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 8),
      },
      {
        title: "Refrigerator Cooling & Compressor Repair",
        category: "Refrigerator",
        description:
          "Thermostat calibration, relay replacement, gas charging, and inverter PCB diagnostics.",
        image:
          "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=900&q=80",
        basePrice: 50,
        estimatedDuration: "2-3 hours",
        serviceMode: "Home Visit",
        serviceArea: "Uttara, Mirpur, Dhaka",
        technicianName: "Nusrat Jahan",
        technicianEmail: "tech2@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
      },
      {
        title: "Deep Freezer Door Gasket & Defrost Fix",
        category: "Refrigerator",
        description:
          "Magnetic door seal replacement and defrost heater/sensor repair to stop ice buildup.",
        image:
          "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80",
        basePrice: 35,
        estimatedDuration: "1.5 hours",
        serviceMode: "Home Visit",
        serviceArea: "Uttara, Dhaka",
        technicianName: "Nusrat Jahan",
        technicianEmail: "tech2@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 6),
      },
      {
        title: "4K Smart LED TV Backlight & Sound Repair",
        category: "TV",
        description:
          "LED backlight strip replacement, power supply board repair, and HDMI port servicing.",
        image:
          "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80",
        basePrice: 45,
        estimatedDuration: "2 hours",
        serviceMode: "Home Visit",
        serviceArea: "Dhanmondi, Mohammadpur, Dhaka",
        technicianName: "Ariful Islam",
        technicianEmail: "tech1@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 5),
      },
      {
        title: "Wall-Mount TV Installation & Cable Concealing",
        category: "TV",
        description:
          "Heavy-duty swivel wall bracket mounting with spirit-level alignment and hidden wiring.",
        image:
          "https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=900&q=80",
        basePrice: 25,
        estimatedDuration: "1 hour",
        serviceMode: "Home Visit",
        serviceArea: "Dhanmondi, Uttara, Dhaka",
        technicianName: "Ariful Islam",
        technicianEmail: "tech1@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 4),
      },
      {
        title: "Front-Load Washing Machine Drum & Drain Fix",
        category: "Washing Machine",
        description:
          "Drain pump clearing, door lock switch replacement, and shock absorber balancing.",
        image:
          "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80",
        basePrice: 45,
        estimatedDuration: "2 hours",
        serviceMode: "Home Visit",
        serviceArea: "Uttara, Banani, Dhaka",
        technicianName: "Nusrat Jahan",
        technicianEmail: "tech2@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3),
      },
      {
        title: "Top-Load Washing Machine Spin & PCB Service",
        category: "Washing Machine",
        description:
          "Water inlet valve repair, gearbox inspection, and error code troubleshooting.",
        image:
          "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=900&q=80",
        basePrice: 40,
        estimatedDuration: "1.5 hours",
        serviceMode: "Home Visit",
        serviceArea: "Mirpur, Uttara, Dhaka",
        technicianName: "Nusrat Jahan",
        technicianEmail: "tech2@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2),
      },
      {
        title: "Home Circuit Breaker, DB Box & Wiring Repair",
        category: "Electrical",
        description:
          "Short-circuit tracing, MCB/RCCB breaker replacement, and load balancing for apartments.",
        image:
          "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=900&q=80",
        basePrice: 30,
        estimatedDuration: "1-2 hours",
        serviceMode: "Home Visit",
        serviceArea: "Dhanmondi, Mirpur, Uttara, Dhaka",
        technicianName: "Nusrat Jahan",
        technicianEmail: "tech2@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 1),
      },
      {
        title: "IPS / Inverter Battery & Surge Protector Setup",
        category: "Electrical",
        description:
          "Home backup inverter installation, pure sine wave testing, and dedicated surge protection.",
        image:
          "https://images.unsplash.com/photo-1558402529-d2638a7023e9?auto=format&fit=crop&w=900&q=80",
        basePrice: 35,
        estimatedDuration: "1.5 hours",
        serviceMode: "Home Visit",
        serviceArea: "Dhanmondi, Gulshan, Dhaka",
        technicianName: "Ariful Islam",
        technicianEmail: "tech1@fixmate.com",
        approvalStatus: "approved",
        isAvailable: true,
        createdAt: now,
      },
    ];

    const insertServicesRes = await servicesCol.insertMany(seedServices);
    const insertedIds = Object.values(insertServicesRes.insertedIds);

    // Seed sample bookings across all statuses so examiner can inspect every state immediately
    const futureDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 2);

    const booking1 = {
      serviceId: insertedIds[0].toString(),
      serviceTitle: seedServices[0].title,
      serviceImage: seedServices[0].image,
      category: seedServices[0].category,
      basePrice: seedServices[0].basePrice,
      technicianName: seedServices[0].technicianName,
      technicianEmail: seedServices[0].technicianEmail,
      customerName: "Sadia Rahman",
      customerEmail: "customer@fixmate.com",
      customerPhone: "+880 1911-889900",
      address: "House 14, Road 7, Mirpur DOHS, Dhaka",
      preferredDate: futureDate,
      problemDescription:
        "Cracked front glass after dropping on tile floor; touch still works intermittently.",
      status: "requested",
      finalAmount: 65,
      paymentStatus: "unpaid",
      createdAt: now,
    };

    const booking2 = {
      serviceId: insertedIds[2].toString(),
      serviceTitle: seedServices[2].title,
      serviceImage: seedServices[2].image,
      category: seedServices[2].category,
      basePrice: seedServices[2].basePrice,
      technicianName: seedServices[2].technicianName,
      technicianEmail: seedServices[2].technicianEmail,
      customerName: "Sadia Rahman",
      customerEmail: "customer@fixmate.com",
      customerPhone: "+880 1911-889900",
      address: "House 14, Road 7, Mirpur DOHS, Dhaka",
      preferredDate: futureDate,
      problemDescription:
        "Laptop fan runs at full speed and overheats during video calls.",
      status: "in-progress",
      finalAmount: 40,
      paymentStatus: "unpaid",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5),
    };

    // Completed & Unpaid (Ready to test "Pay Now" button immediately!)
    const booking3 = {
      serviceId: insertedIds[4].toString(),
      serviceTitle: seedServices[4].title,
      serviceImage: seedServices[4].image,
      category: seedServices[4].category,
      basePrice: seedServices[4].basePrice,
      technicianName: seedServices[4].technicianName,
      technicianEmail: seedServices[4].technicianEmail,
      customerName: "Sadia Rahman",
      customerEmail: "customer@fixmate.com",
      customerPhone: "+880 1911-889900",
      address: "House 14, Road 7, Mirpur DOHS, Dhaka",
      preferredDate: now,
      problemDescription:
        "Bedroom split AC leaking water indoors and blowing warm air.",
      status: "completed",
      finalAmount: 45,
      paymentStatus: "unpaid",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24),
    };

    // Completed & Paid (Shows in Payment History & Admin Transactions!)
    const booking4 = {
      serviceId: insertedIds[12].toString(),
      serviceTitle: seedServices[12].title,
      serviceImage: seedServices[12].image,
      category: seedServices[12].category,
      basePrice: seedServices[12].basePrice,
      technicianName: seedServices[12].technicianName,
      technicianEmail: seedServices[12].technicianEmail,
      customerName: "Sadia Rahman",
      customerEmail: "customer@fixmate.com",
      customerPhone: "+880 1911-889900",
      address: "House 14, Road 7, Mirpur DOHS, Dhaka",
      preferredDate: new Date(now.getTime() - 1000 * 60 * 60 * 48),
      problemDescription:
        "Main kitchen circuit breaker trips whenever microwave and kettle run together.",
      status: "completed",
      finalAmount: 35,
      paymentStatus: "paid",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 48),
    };

    const insertBookingsRes = await bookingsCol.insertMany([
      booking1,
      booking2,
      booking3,
      booking4,
    ]);

    await paymentsCol.insertOne({
      bookingId: insertBookingsRes.insertedIds[3].toString(),
      serviceTitle: booking4.serviceTitle,
      customerName: booking4.customerName,
      customerEmail: booking4.customerEmail,
      technicianName: booking4.technicianName,
      technicianEmail: booking4.technicianEmail,
      amount: 35,
      currency: "usd",
      transactionId: "pi_3QSeededDemoTransaction001",
      stripeSessionId: "cs_test_seeded_demo_session_001",
      paymentStatus: "paid",
      paidAt: new Date(now.getTime() - 1000 * 60 * 60 * 36),
    });

    console.log(
      "Seeded 14 approved services, 4 sample bookings, and 1 payment record!",
    );
  } finally {
    await client.close();
  }
}

seedDatabase();
