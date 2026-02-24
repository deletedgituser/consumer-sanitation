"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Customer = {
  id: string;
  recordNumber: string;
  appType: "new" | "change";
  membership: "household" | "corporate";
  area: string;
  district: string;
  barangay: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffixName: string;
  birthdate: string;
  noMiddleName: boolean;
  gender: "male" | "female";
  civilStatus: string;
  spouseFirst: string;
  spouseMiddle: string;
  spouseLast: string;
  spouseSuffix: string;
  spouseBirthdate: string;
  residenceAddress: string;
  cellphone: string;
  landline: string;
  email: string;
  privacyConsent: boolean;
  privacyNewsletter: boolean;
  privacyEmail: boolean;
  privacySms: boolean;
  privacyPhone: boolean;
  privacySocial: boolean;
  cosignatory: string;
  witness: string;
  status: string;
  orNumber: string;
  dateIssued: string;
  notes: string;
};

const mockCustomers: Customer[] = [
  {
    id: "1",
    recordNumber: "190608",
    appType: "new",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "KINABJANGAN",
    firstName: "JHONELLE",
    middleName: "AYENSA",
    lastName: "ALMEROL",
    suffixName: "",
    birthdate: "10/20/1988",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Maria",
    spouseMiddle: "Santos",
    spouseLast: "Almerol",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1990",
    residenceAddress: "D-1, BRGY. KINABJANGAN, NASIPIT, AGUSAN DEL NORTE",
    cellphone: "09976059397",
    landline: "",
    email: "jhonelle.almerol@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: false,
    privacySms: true,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Signed up",
    orNumber: "896052",
    dateIssued: "11/18/2021",
    notes: "",
  },
  {
    id: "2",
    recordNumber: "190609",
    appType: "change",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "TALISAY",
    firstName: "CARLOS",
    middleName: "REYES",
    lastName: "MAGNO",
    suffixName: "JR.",
    birthdate: "05/15/1985",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Ana",
    spouseMiddle: "Lopez",
    spouseLast: "Magno",
    spouseSuffix: "",
    spouseBirthdate: "08/22/1987",
    residenceAddress: "Purok 3, Brgy. Talisay, Nasipit, Agusan del Norte",
    cellphone: "09171234567",
    landline: "(085) 234-5678",
    email: "carlos.magno@example.com",
    privacyConsent: true,
    privacyNewsletter: false,
    privacyEmail: true,
    privacySms: false,
    privacyPhone: true,
    privacySocial: false,
    cosignatory: "Juan Dela Cruz",
    witness: "Pedro Reyes",
    status: "Pending",
    orNumber: "896053",
    dateIssued: "02/01/2025",
    notes: "Change of address.",
  },
  {
    id: "3",
    recordNumber: "190610",
    appType: "new",
    membership: "corporate",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "VILLANUEVA",
    firstName: "MARIA",
    middleName: "",
    lastName: "SANTOS",
    suffixName: "",
    birthdate: "12/03/1992",
    noMiddleName: true,
    gender: "female",
    civilStatus: "single",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Blk 5, Villanueva Subd., Butuan City",
    cellphone: "09987654321",
    landline: "",
    email: "maria.santos@example.com",
    privacyConsent: false,
    privacyNewsletter: false,
    privacyEmail: false,
    privacySms: false,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "Company Rep",
    witness: "Legal Officer",
    status: "Approved",
    orNumber: "896054",
    dateIssued: "02/10/2025",
    notes: "Corporate account.",
  },
  {
    id: "4",
    recordNumber: "190611",
    appType: "new",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "APLAYA",
    firstName: "RODEL",
    middleName: "CASTILLO",
    lastName: "BARCELONA",
    suffixName: "",
    birthdate: "03/14/1990",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Liza",
    spouseMiddle: "Mendoza",
    spouseLast: "Barcelona",
    spouseSuffix: "",
    spouseBirthdate: "07/08/1992",
    residenceAddress: "Purok 5, Brgy. Aplaya, Nasipit",
    cellphone: "09181234567",
    landline: "",
    email: "rodel.barcelona@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: true,
    privacySms: false,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Pending",
    orNumber: "896055",
    dateIssued: "01/15/2025",
    notes: "",
  },
  {
    id: "5",
    recordNumber: "190612",
    appType: "change",
    membership: "household",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "BAAN",
    firstName: "ELENA",
    middleName: "GARCIA",
    lastName: "DIAZ",
    suffixName: "",
    birthdate: "09/22/1982",
    noMiddleName: false,
    gender: "female",
    civilStatus: "widow/widower",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Baan Km. 3, Butuan City",
    cellphone: "09221234567",
    landline: "(085) 345-6789",
    email: "elena.diaz@example.com",
    privacyConsent: true,
    privacyNewsletter: false,
    privacyEmail: true,
    privacySms: true,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "Rosa Martinez",
    witness: "Teresa Cruz",
    status: "Approved",
    orNumber: "896056",
    dateIssued: "12/05/2024",
    notes: "Change of meter.",
  },
  {
    id: "6",
    recordNumber: "190613",
    appType: "new",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "CAMAGONG",
    firstName: "FERNANDO",
    middleName: "ISIDRO",
    lastName: "ESTRADA",
    suffixName: "III",
    birthdate: "11/30/1978",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Carmen",
    spouseMiddle: "Ramos",
    spouseLast: "Estrada",
    spouseSuffix: "",
    spouseBirthdate: "04/12/1980",
    residenceAddress: "Sitio Camagong, Nasipit",
    cellphone: "09331234567",
    landline: "",
    email: "fernando.estrada@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: false,
    privacySms: true,
    privacyPhone: true,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Signed up",
    orNumber: "896057",
    dateIssued: "10/20/2024",
    notes: "",
  },
  {
    id: "7",
    recordNumber: "190614",
    appType: "new",
    membership: "household",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "AMBAGO",
    firstName: "GRACE",
    middleName: "LORENZO",
    lastName: "FLORES",
    suffixName: "",
    birthdate: "06/17/1995",
    noMiddleName: false,
    gender: "female",
    civilStatus: "single",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Ambagan, Butuan City",
    cellphone: "09441234567",
    landline: "",
    email: "grace.flores@example.com",
    privacyConsent: false,
    privacyNewsletter: false,
    privacyEmail: false,
    privacySms: false,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Pending",
    orNumber: "896058",
    dateIssued: "02/08/2025",
    notes: "",
  },
  {
    id: "8",
    recordNumber: "190615",
    appType: "change",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "TALISAY",
    firstName: "HECTOR",
    middleName: "NAVARRO",
    lastName: "GOMEZ",
    suffixName: "",
    birthdate: "02/28/1987",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Irene",
    spouseMiddle: "Ocampo",
    spouseLast: "Gomez",
    spouseSuffix: "",
    spouseBirthdate: "10/11/1989",
    residenceAddress: "Talisay Proper, Nasipit",
    cellphone: "09551234567",
    landline: "(085) 456-7890",
    email: "hector.gomez@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: true,
    privacySms: true,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "Pablo Santos",
    witness: "Luis Reyes",
    status: "Approved",
    orNumber: "896059",
    dateIssued: "11/28/2024",
    notes: "Transfer of service.",
  },
  {
    id: "9",
    recordNumber: "190616",
    appType: "new",
    membership: "corporate",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "TINIWISAN",
    firstName: "IRMA",
    middleName: "",
    lastName: "HERRERA",
    suffixName: "",
    birthdate: "08/05/1988",
    noMiddleName: true,
    gender: "female",
    civilStatus: "single",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Tiniwisan, Butuan City",
    cellphone: "09661234567",
    landline: "",
    email: "irma.herrera@example.com",
    privacyConsent: true,
    privacyNewsletter: false,
    privacyEmail: true,
    privacySms: false,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "HR Manager",
    witness: "Admin Officer",
    status: "Pending",
    orNumber: "896060",
    dateIssued: "01/22/2025",
    notes: "Business account.",
  },
  {
    id: "10",
    recordNumber: "190617",
    appType: "new",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "KINABJANGAN",
    firstName: "JOSE",
    middleName: "PABLO",
    lastName: "IGNACIO",
    suffixName: "JR.",
    birthdate: "01/12/1975",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Katherine",
    spouseMiddle: "Quizon",
    spouseLast: "Ignacio",
    spouseSuffix: "",
    spouseBirthdate: "05/19/1978",
    residenceAddress: "Brgy. Kinabjangan, Nasipit",
    cellphone: "09771234567",
    landline: "",
    email: "jose.ignacio@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: true,
    privacySms: true,
    privacyPhone: true,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Signed up",
    orNumber: "896061",
    dateIssued: "09/14/2024",
    notes: "",
  },
  {
    id: "11",
    recordNumber: "190618",
    appType: "change",
    membership: "household",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "LEMON",
    firstName: "KARLA",
    middleName: "REGALADO",
    lastName: "JIMENEZ",
    suffixName: "",
    birthdate: "07/03/1993",
    noMiddleName: false,
    gender: "female",
    civilStatus: "married",
    spouseFirst: "Leo",
    spouseMiddle: "Santiago",
    spouseLast: "Jimenez",
    spouseSuffix: "",
    spouseBirthdate: "12/25/1991",
    residenceAddress: "Lemon Road, Butuan City",
    cellphone: "09881234567",
    landline: "",
    email: "karla.jimenez@example.com",
    privacyConsent: true,
    privacyNewsletter: false,
    privacyEmail: true,
    privacySms: false,
    privacyPhone: false,
    privacySocial: true,
    cosignatory: "",
    witness: "",
    status: "Pending",
    orNumber: "896062",
    dateIssued: "02/12/2025",
    notes: "New construction.",
  },
  {
    id: "12",
    recordNumber: "190619",
    appType: "new",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "APLAYA",
    firstName: "LUIS",
    middleName: "TORRES",
    lastName: "KAPUNAN",
    suffixName: "",
    birthdate: "04/20/1984",
    noMiddleName: false,
    gender: "male",
    civilStatus: "separated",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Aplaya Seaside, Nasipit",
    cellphone: "09991234567",
    landline: "(085) 567-8901",
    email: "luis.kapunan@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: false,
    privacySms: true,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "Miguel Cruz",
    witness: "Andres Lopez",
    status: "Approved",
    orNumber: "896063",
    dateIssued: "10/05/2024",
    notes: "",
  },
  {
    id: "13",
    recordNumber: "190620",
    appType: "new",
    membership: "household",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "VILLANUEVA",
    firstName: "NORMA",
    middleName: "URBANO",
    lastName: "LAGMAN",
    suffixName: "",
    birthdate: "10/08/1991",
    noMiddleName: false,
    gender: "female",
    civilStatus: "single",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Villanueva St., Butuan City",
    cellphone: "09102234567",
    landline: "",
    email: "norma.lagman@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: true,
    privacySms: true,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Pending",
    orNumber: "896064",
    dateIssued: "01/30/2025",
    notes: "",
  },
  {
    id: "14",
    recordNumber: "190621",
    appType: "change",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "TALISAY",
    firstName: "OSCAR",
    middleName: "VALDEZ",
    lastName: "MARTINEZ",
    suffixName: "",
    birthdate: "12/15/1979",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Patricia",
    spouseMiddle: "Wong",
    spouseLast: "Martinez",
    spouseSuffix: "",
    spouseBirthdate: "03/27/1982",
    residenceAddress: "Talisay Heights, Nasipit",
    cellphone: "09112345678",
    landline: "",
    email: "oscar.martinez@example.com",
    privacyConsent: true,
    privacyNewsletter: false,
    privacyEmail: true,
    privacySms: false,
    privacyPhone: true,
    privacySocial: false,
    cosignatory: "Roberto Tan",
    witness: "Enrique Lim",
    status: "Signed up",
    orNumber: "896065",
    dateIssued: "08/18/2024",
    notes: "Name change.",
  },
  {
    id: "15",
    recordNumber: "190622",
    appType: "new",
    membership: "household",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "BAAN",
    firstName: "PAULA",
    middleName: "XAVIER",
    lastName: "NAVARRO",
    suffixName: "",
    birthdate: "05/24/1986",
    noMiddleName: false,
    gender: "female",
    civilStatus: "married",
    spouseFirst: "Quentin",
    spouseMiddle: "Yap",
    spouseLast: "Navarro",
    spouseSuffix: "",
    spouseBirthdate: "09/10/1985",
    residenceAddress: "Baan Riverside, Butuan City",
    cellphone: "09123456789",
    landline: "(085) 678-9012",
    email: "paula.navarro@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: true,
    privacySms: true,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Approved",
    orNumber: "896066",
    dateIssued: "11/02/2024",
    notes: "",
  },
  {
    id: "16",
    recordNumber: "190623",
    appType: "new",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "CAMAGONG",
    firstName: "RAMON",
    middleName: "ZAMORA",
    lastName: "OLIVARES",
    suffixName: "SR.",
    birthdate: "08/11/1972",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Sofia",
    spouseMiddle: "Abad",
    spouseLast: "Olivares",
    spouseSuffix: "",
    spouseBirthdate: "02/14/1974",
    residenceAddress: "Camagong North, Nasipit",
    cellphone: "09134567890",
    landline: "",
    email: "ramon.olivares@example.com",
    privacyConsent: true,
    privacyNewsletter: false,
    privacyEmail: false,
    privacySms: true,
    privacyPhone: true,
    privacySocial: false,
    cosignatory: "Tomas Reyes",
    witness: "Vicente Cruz",
    status: "Pending",
    orNumber: "896067",
    dateIssued: "02/05/2025",
    notes: "",
  },
  {
    id: "17",
    recordNumber: "190624",
    appType: "change",
    membership: "household",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "AMBAGO",
    firstName: "SANDRA",
    middleName: "BENEDICTO",
    lastName: "PASCUAL",
    suffixName: "",
    birthdate: "11/29/1994",
    noMiddleName: false,
    gender: "female",
    civilStatus: "single",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Ambagan Phase 2, Butuan City",
    cellphone: "09145678901",
    landline: "",
    email: "sandra.pascual@example.com",
    privacyConsent: false,
    privacyNewsletter: false,
    privacyEmail: false,
    privacySms: false,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Approved",
    orNumber: "896068",
    dateIssued: "12/20/2024",
    notes: "Transfer.",
  },
  {
    id: "18",
    recordNumber: "190625",
    appType: "new",
    membership: "corporate",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "KINABJANGAN",
    firstName: "TEOFILO",
    middleName: "CRUZ",
    lastName: "QUINTOS",
    suffixName: "",
    birthdate: "06/07/1981",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Uma",
    spouseMiddle: "Dizon",
    spouseLast: "Quintos",
    spouseSuffix: "",
    spouseBirthdate: "01/15/1983",
    residenceAddress: "Industrial Area, Kinabjangan, Nasipit",
    cellphone: "09156789012",
    landline: "(085) 789-0123",
    email: "teofilo.quintos@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: true,
    privacySms: false,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "Corp Secretary",
    witness: "Accountant",
    status: "Signed up",
    orNumber: "896069",
    dateIssued: "07/22/2024",
    notes: "Factory connection.",
  },
  {
    id: "19",
    recordNumber: "190626",
    appType: "new",
    membership: "household",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "TINIWISAN",
    firstName: "URSULA",
    middleName: "ESTRADA",
    lastName: "RAMOS",
    suffixName: "",
    birthdate: "09/18/1989",
    noMiddleName: false,
    gender: "female",
    civilStatus: "married",
    spouseFirst: "Victor",
    spouseMiddle: "Fuentes",
    spouseLast: "Ramos",
    spouseSuffix: "",
    spouseBirthdate: "04/30/1987",
    residenceAddress: "Tiniwisan Proper, Butuan City",
    cellphone: "09167890123",
    landline: "",
    email: "ursula.ramos@example.com",
    privacyConsent: true,
    privacyNewsletter: false,
    privacyEmail: true,
    privacySms: true,
    privacyPhone: true,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Pending",
    orNumber: "896070",
    dateIssued: "02/18/2025",
    notes: "",
  },
  {
    id: "20",
    recordNumber: "190627",
    appType: "change",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "APLAYA",
    firstName: "VICENTE",
    middleName: "GUTIERREZ",
    lastName: "SALAZAR",
    suffixName: "JR.",
    birthdate: "02/03/1976",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "Wilma",
    spouseMiddle: "Herrera",
    spouseLast: "Salazar",
    spouseSuffix: "",
    spouseBirthdate: "07/19/1978",
    residenceAddress: "Aplaya Beach Rd., Nasipit",
    cellphone: "09178901234",
    landline: "(085) 890-1234",
    email: "vicente.salazar@example.com",
    privacyConsent: true,
    privacyNewsletter: true,
    privacyEmail: true,
    privacySms: true,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "Felipe Ortiz",
    witness: "Gregorio Mendez",
    status: "Approved",
    orNumber: "896071",
    dateIssued: "10/30/2024",
    notes: "Upgrade to 3-phase.",
  },
  {
    id: "21",
    recordNumber: "190628",
    appType: "new",
    membership: "household",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "LEMON",
    firstName: "ROGELIO",
    middleName: "IMPERIAL",
    lastName: "TAN",
    suffixName: "",
    birthdate: "04/12/1980",
    noMiddleName: false,
    gender: "male",
    civilStatus: "single",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Lemon St., Butuan City",
    cellphone: "09180001111",
    landline: "",
    email: "rogelio.tan@example.com",
    privacyConsent: false,
    privacyNewsletter: false,
    privacyEmail: false,
    privacySms: false,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Declined",
    orNumber: "896072",
    dateIssued: "01/05/2025",
    notes: "Incomplete documents.",
  },
  {
    id: "22",
    recordNumber: "190629",
    appType: "change",
    membership: "household",
    area: "Area 2-Nasipit",
    district: "Dist 7 - NASIPIT",
    barangay: "TALISAY",
    firstName: "YOLANDA",
    middleName: "UNICO",
    lastName: "VALDEZ",
    suffixName: "",
    birthdate: "11/08/1975",
    noMiddleName: false,
    gender: "female",
    civilStatus: "widow/widower",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Talisay, Nasipit",
    cellphone: "09181112222",
    landline: "(085) 111-2233",
    email: "yolanda.valdez@example.com",
    privacyConsent: true,
    privacyNewsletter: false,
    privacyEmail: true,
    privacySms: false,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "",
    witness: "",
    status: "Declined",
    orNumber: "896073",
    dateIssued: "02/02/2025",
    notes: "Failed verification.",
  },
  {
    id: "23",
    recordNumber: "190630",
    appType: "new",
    membership: "corporate",
    area: "Area 1-Butuan",
    district: "Dist 1 - BUTUAN",
    barangay: "VILLANUEVA",
    firstName: "ZALDY",
    middleName: "WENCESLAO",
    lastName: "XAVIER",
    suffixName: "",
    birthdate: "08/20/1982",
    noMiddleName: false,
    gender: "male",
    civilStatus: "married",
    spouseFirst: "",
    spouseMiddle: "",
    spouseLast: "",
    spouseSuffix: "",
    spouseBirthdate: "01/01/1900",
    residenceAddress: "Villanueva, Butuan City",
    cellphone: "09182223333",
    landline: "",
    email: "zaldy.xavier@example.com",
    privacyConsent: true,
    privacyNewsletter: false,
    privacyEmail: false,
    privacySms: true,
    privacyPhone: false,
    privacySocial: false,
    cosignatory: "Corp Rep",
    witness: "",
    status: "Declined",
    orNumber: "896074",
    dateIssued: "01/28/2025",
    notes: "Duplicate application.",
  },
];

// Palette: primary #F8843F, secondary #FFF19B, tertiary #3D45AA
const sectionHeaderClass = "rounded-t-lg bg-[#3D45AA] px-4 py-2 text-sm font-semibold text-white";

function CustomerDetail({
  customer,
  onBack,
  theme,
  onApprove,
  onDecline,
  onEdit,
  isEditing,
  onDone,
  onCancel,
}: {
  customer: Customer;
  onBack: () => void;
  theme: Theme;
  onApprove?: () => void;
  onDecline?: () => void;
  onEdit?: () => void;
  isEditing?: boolean;
  onDone?: (draft: Customer) => void;
  onCancel?: () => void;
}) {
  const isDark = theme === "dark";
  const isPending = customer.status === "Pending";
  const textPrimary = isDark ? "text-white" : "text-slate-800";
  const textMuted = isDark ? "text-slate-300" : "text-slate-500";
  const boxClass = isDark
    ? "mt-1.5 rounded-b-lg border border-slate-600 bg-slate-700/50 px-4 py-3"
    : "mt-1.5 rounded-b-lg border border-slate-200 bg-slate-50/50 px-4 py-3";
  const btnClass = isDark
    ? "rounded-lg border border-slate-500 bg-slate-700 px-3 py-2 text-sm font-medium text-white transition-all duration-200 ease-out hover:bg-slate-600 active:scale-[0.98]"
    : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-200 ease-out hover:bg-slate-50 active:scale-[0.98]";
  const editBtnClass = "rounded-md border border-[#3D45AA] bg-[#3D45AA] px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-[#323b96] active:scale-[0.98]";
  const approveBtnClass = "rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98]";
  const declineBtnClass = "rounded-md border border-red-600 bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-700 active:scale-[0.98]";
  const doneBtnClass = "rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-emerald-700 active:scale-[0.98]";
  const cancelBtnClass = isDark
    ? "rounded-md border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-slate-600 active:scale-[0.98]"
    : "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]";
  const inputClass = isDark
    ? "w-full rounded border border-slate-500 bg-slate-700 text-white px-2 py-1.5 text-sm focus:border-[#FFF19B] focus:outline-none focus:ring-1 focus:ring-[#FFF19B]"
    : "w-full rounded border border-slate-300 bg-white text-slate-800 px-2 py-1.5 text-sm focus:border-[#3D45AA] focus:outline-none focus:ring-1 focus:ring-[#3D45AA]";

  const [draft, setDraft] = useState<Customer>(customer);
  useEffect(() => {
    if (isEditing) setDraft(customer);
  }, [isEditing, customer]);

  const display = isEditing ? draft : customer;
  const setDisplay = setDraft;

  return (
    <div className="space-y-1">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={`flex items-center gap-2 ${btnClass}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to list
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`text-sm ${isDark ? "text-[#FFF19B]" : textMuted}`}>Record #{customer.recordNumber}</span>
          {isEditing && onDone && onCancel ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2">
              <button type="button" onClick={() => onDone(draft)} className={doneBtnClass}>
                Done
              </button>
              <button type="button" onClick={onCancel} className={cancelBtnClass}>
                Cancel
              </button>
            </div>
          ) : isPending && (onApprove || onDecline || onEdit) ? (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2">
              {onEdit && (
                <button type="button" onClick={onEdit} className={editBtnClass}>
                  Edit
                </button>
              )}
              {onApprove && (
                <button type="button" onClick={onApprove} className={approveBtnClass}>
                  Approve
                </button>
              )}
              {onDecline && (
                <button type="button" onClick={onDecline} className={declineBtnClass}>
                  Decline
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Application Type + Membership Type */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Application Type</div>
        <div className={boxClass}>
          {isEditing ? (
            <select
              value={display.appType}
              onChange={(e) => setDisplay((d) => ({ ...d, appType: e.target.value as "new" | "change" }))}
              className={inputClass}
            >
              <option value="new">As New Member</option>
              <option value="change">As Change/New Occupant</option>
            </select>
          ) : (
            <p className={textPrimary}>
              {customer.appType === "new" ? "As New Member" : "As Change/New Occupant"}
            </p>
          )}
        </div>
        <div className={`mt-3 ${sectionHeaderClass}`}>Membership Type</div>
        <div className={boxClass}>
          {isEditing ? (
            <select
              value={display.membership}
              onChange={(e) => setDisplay((d) => ({ ...d, membership: e.target.value as "household" | "corporate" }))}
              className={inputClass}
            >
              <option value="household">Household</option>
              <option value="corporate">Corporate/Sectoral/Business</option>
            </select>
          ) : (
            <p className={textPrimary}>
              {customer.membership === "household"
                ? "Household"
                : "Corporate/Sectoral/Business"}
            </p>
          )}
        </div>
      </div>

      {/* Record Location (Branch) */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Record Location (Branch)</div>
        <div className={boxClass}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Area</p>
              {isEditing ? (
                <input value={display.area} onChange={(e) => setDisplay((d) => ({ ...d, area: e.target.value }))} className={inputClass} />
              ) : (
                <p className={textPrimary}>{customer.area}</p>
              )}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>District</p>
              {isEditing ? (
                <input value={display.district} onChange={(e) => setDisplay((d) => ({ ...d, district: e.target.value }))} className={inputClass} />
              ) : (
                <p className={textPrimary}>{customer.district}</p>
              )}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Barangay</p>
              {isEditing ? (
                <input value={display.barangay} onChange={(e) => setDisplay((d) => ({ ...d, barangay: e.target.value }))} className={inputClass} />
              ) : (
                <p className={textPrimary}>{customer.barangay}</p>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Record No.</p>
                <p className={`flex items-center gap-2 ${textPrimary}`}>
                  {customer.recordNumber}
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <span className="text-xs font-semibold">✓</span>
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Applicant (2'x2' photo) */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Applicant (2&apos;x2&apos; photo)</div>
        <div className={boxClass}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>First Name</p>
                {isEditing ? <input value={display.firstName} onChange={(e) => setDisplay((d) => ({ ...d, firstName: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.firstName}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Middle Name</p>
                {isEditing ? <input value={display.middleName} onChange={(e) => setDisplay((d) => ({ ...d, middleName: e.target.value }))} className={inputClass} disabled={display.noMiddleName} /> : <p className={textPrimary}>{customer.noMiddleName ? "—" : customer.middleName || "—"}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Last Name</p>
                {isEditing ? <input value={display.lastName} onChange={(e) => setDisplay((d) => ({ ...d, lastName: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.lastName}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Suffix Name</p>
                {isEditing ? <input value={display.suffixName} onChange={(e) => setDisplay((d) => ({ ...d, suffixName: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.suffixName || "—"}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Birthdate</p>
                {isEditing ? <input value={display.birthdate} onChange={(e) => setDisplay((d) => ({ ...d, birthdate: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.birthdate}</p>}
              </div>
              <div className="flex items-end">
                {isEditing ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={display.noMiddleName} onChange={(e) => setDisplay((d) => ({ ...d, noMiddleName: e.target.checked }))} className="rounded" />
                    <span className={textMuted}>No Middle Name</span>
                  </label>
                ) : (
                  <p className={`text-sm ${textMuted}`}>{customer.noMiddleName ? "☑ No Middle Name" : "☐ No Middle Name"}</p>
                )}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Gender</p>
                {isEditing ? (
                  <select value={display.gender} onChange={(e) => setDisplay((d) => ({ ...d, gender: e.target.value as "male" | "female" }))} className={inputClass}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                ) : (
                  <p className={textPrimary}>{customer.gender === "male" ? "Male" : "Female"}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <p className={`text-xs font-medium ${textMuted}`}>Civil Status</p>
                {isEditing ? <input value={display.civilStatus} onChange={(e) => setDisplay((d) => ({ ...d, civilStatus: e.target.value }))} className={inputClass} /> : <p className={`capitalize ${textPrimary}`}>{customer.civilStatus}</p>}
              </div>
            </div>
            <div className="flex shrink-0 justify-center sm:justify-end">
              <div className={`flex h-28 w-28 items-center justify-center rounded-lg border-2 border-dashed ${isDark ? "border-[#FFF19B]/70 bg-slate-600 text-[#FFF19B]/90" : "border-slate-300 bg-slate-100 text-slate-400"}`}>
                <span className="text-xs">Photo</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Applicant's Spouse */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Applicant&apos;s Spouse (Husband/Wife) Photo</div>
        <div className={boxClass}>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>First Name</p>
                {isEditing ? <input value={display.spouseFirst} onChange={(e) => setDisplay((d) => ({ ...d, spouseFirst: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.spouseFirst || "—"}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Middle Name</p>
                {isEditing ? <input value={display.spouseMiddle} onChange={(e) => setDisplay((d) => ({ ...d, spouseMiddle: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.spouseMiddle || "—"}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Last Name</p>
                {isEditing ? <input value={display.spouseLast} onChange={(e) => setDisplay((d) => ({ ...d, spouseLast: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.spouseLast || "—"}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Suffix Name</p>
                {isEditing ? <input value={display.spouseSuffix} onChange={(e) => setDisplay((d) => ({ ...d, spouseSuffix: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.spouseSuffix || "—"}</p>}
              </div>
              <div>
                <p className={`text-xs font-medium ${textMuted}`}>Birthdate</p>
                {isEditing ? <input value={display.spouseBirthdate} onChange={(e) => setDisplay((d) => ({ ...d, spouseBirthdate: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.spouseBirthdate || "—"}</p>}
              </div>
            </div>
            <div className="flex shrink-0 justify-center sm:justify-end">
              <div className={`flex h-28 w-28 items-center justify-center rounded-lg border-2 border-dashed text-center text-xs ${isDark ? "border-[#FFF19B]/70 bg-slate-600 text-[#FFF19B]/90" : "border-slate-300 bg-slate-100 text-slate-400"}`}>
                DOUBLE CLICK TO ADD PHOTO
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Residence & Contact */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Residence & Contact</div>
        <div className={`${boxClass} space-y-3`}>
          <div>
            <p className={`text-xs font-medium ${textMuted}`}>Residence Address</p>
            {isEditing ? <input value={display.residenceAddress} onChange={(e) => setDisplay((d) => ({ ...d, residenceAddress: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.residenceAddress || "—"}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Cellphone No.</p>
              {isEditing ? <input value={display.cellphone} onChange={(e) => setDisplay((d) => ({ ...d, cellphone: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.cellphone || "—"}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Landline No.</p>
              {isEditing ? <input value={display.landline} onChange={(e) => setDisplay((d) => ({ ...d, landline: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.landline || "—"}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>E-mail Address</p>
              {isEditing ? <input value={display.email} onChange={(e) => setDisplay((d) => ({ ...d, email: e.target.value }))} className={inputClass} type="email" /> : <p className={textPrimary}>{customer.email || "—"}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Option */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Privacy Option</div>
        <div className={boxClass}>
          {isEditing ? (
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={display.privacyConsent} onChange={(e) => setDisplay((d) => ({ ...d, privacyConsent: e.target.checked }))} className="rounded" />
                <span className={textPrimary}>Consent for marketing communications</span>
              </label>
              {display.privacyConsent && (
                <div className="flex flex-wrap gap-4">
                  {["privacyNewsletter", "privacyEmail", "privacySms", "privacyPhone", "privacySocial"].map((key, i) => {
                    const labels = ["Newsletter", "Email", "SMS", "Phone", "Social media"];
                    const k = key as keyof Customer;
                    return (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!display[k]} onChange={(e) => setDisplay((d) => ({ ...d, [k]: e.target.checked }))} className="rounded" />
                        <span className={textMuted}>{labels[i]}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              <p className={textPrimary}>
                {customer.privacyConsent
                  ? "Yes, I would like to receive information about the goods and services provided by ANECO, INC., via the following channels:"
                  : "No consent for marketing communications."}
              </p>
              {customer.privacyConsent && (
                <ul className={`mt-2 flex flex-wrap gap-4 text-sm ${textMuted}`}>
                  {customer.privacyNewsletter && <li>newsletter</li>}
                  {customer.privacyEmail && <li>email</li>}
                  {customer.privacySms && <li>text message</li>}
                  {customer.privacyPhone && <li>telephone call</li>}
                  {customer.privacySocial && <li>social media</li>}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* Co-signatory, Witness, Contract Status */}
      <div className="mb-4">
        <div className={sectionHeaderClass}>Other Details</div>
        <div className={boxClass}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Co-signatory</p>
              {isEditing ? <input value={display.cosignatory} onChange={(e) => setDisplay((d) => ({ ...d, cosignatory: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.cosignatory || "—"}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Witness</p>
              {isEditing ? <input value={display.witness} onChange={(e) => setDisplay((d) => ({ ...d, witness: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.witness || "—"}</p>}
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Contract Status</p>
              {isEditing ? <input value={display.status} onChange={(e) => setDisplay((d) => ({ ...d, status: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.status}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>OR Number</p>
              {isEditing ? <input value={display.orNumber} onChange={(e) => setDisplay((d) => ({ ...d, orNumber: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.orNumber}</p>}
            </div>
            <div>
              <p className={`text-xs font-medium ${textMuted}`}>Date Issued</p>
              {isEditing ? <input value={display.dateIssued} onChange={(e) => setDisplay((d) => ({ ...d, dateIssued: e.target.value }))} className={inputClass} /> : <p className={textPrimary}>{customer.dateIssued}</p>}
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-xs font-medium ${textMuted}`}>Notes</p>
            {isEditing ? <textarea value={display.notes} onChange={(e) => setDisplay((d) => ({ ...d, notes: e.target.value }))} className={`${inputClass} min-h-[80px]`} rows={3} /> : <p className={textPrimary}>{customer.notes || "—"}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

type NavId = "dashboard" | "pending" | "approved" | "declined" | "logs" | "statistics";
type Theme = "light" | "dark";

const navItems: { id: NavId; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    id: "pending",
    label: "Pending Application",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "approved",
    label: "Approved Application",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "declined",
    label: "Declined Application",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "logs",
    label: "Logs",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    id: "statistics",
    label: "Statistics",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

function ApplicationsTable({
  customers,
  onView,
  searchQuery,
  theme,
}: {
  customers: Customer[];
  onView: (c: Customer) => void;
  searchQuery: string;
  theme: Theme;
}) {
  const filtered = searchQuery.trim()
    ? customers.filter(
        (c) =>
          `${c.firstName} ${c.lastName} ${c.recordNumber} ${c.area} ${c.barangay}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      )
    : customers;

  const thClass = theme === "dark" ? "px-4 py-3 font-semibold text-white" : "px-4 py-3 font-semibold text-slate-700";
  const tdClass = theme === "dark" ? "px-4 py-3 text-white" : "px-4 py-3 text-slate-800";
  const tdMutedClass = theme === "dark" ? "px-4 py-3 text-slate-200" : "px-4 py-3 text-slate-600";

  return (
    <div className="overflow-x-auto rounded-lg overflow-hidden">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className={theme === "dark" ? "border-b border-slate-600 bg-slate-700" : "border-b border-slate-200 bg-slate-50"}>
            <th className={thClass}>Record #</th>
            <th className={thClass}>Name</th>
            <th className={thClass}>Area</th>
            <th className={thClass}>Barangay</th>
            <th className={thClass}>Status</th>
            <th className={thClass}>OR Number</th>
            <th className={thClass}>Date Issued</th>
            <th className={thClass}>Action</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((c) => (
            <tr
              key={c.id}
              className={`border-b transition-all duration-200 ease-out hover:bg-[#FFF19B]/20 ${
                theme === "dark" ? "border-slate-600" : "border-slate-100"
              }`}
            >
              <td className={tdClass}>{c.recordNumber}</td>
              <td className={`${theme === "dark" ? "px-4 py-3 font-medium text-white" : "px-4 py-3 font-medium text-slate-800"}`}>
                {c.firstName} {c.middleName ? c.middleName.charAt(0) + "." : ""} {c.lastName}
              </td>
              <td className={tdMutedClass}>{c.area}</td>
              <td className={tdMutedClass}>{c.barangay}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200 ${
                    c.status === "Pending"
                      ? "bg-[#FFF19B] text-slate-800"
                      : c.status === "Declined"
                        ? theme === "dark"
                          ? "bg-red-900/50 text-red-200"
                          : "bg-red-100 text-red-800"
                        : theme === "dark"
                          ? "bg-emerald-900/50 text-emerald-200"
                          : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {c.status}
                </span>
              </td>
              <td className={tdMutedClass}>{c.orNumber}</td>
              <td className={tdMutedClass}>{c.dateIssued}</td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onView(c)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-out hover:bg-[#F8843F] active:scale-95 ${
                  theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
                }`}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selected, setSelected] = useState<Customer | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<NavId>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [customerEdits, setCustomerEdits] = useState<Record<string, Customer>>({});
  const [detailEditMode, setDetailEditMode] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  
  // API state
  const [applications, setApplications] = useState<Customer[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getEffectiveStatus = (c: Customer) => statusOverrides[c.id] ?? c.status;

  // Calculate counts
  const pendingCount = applications.filter((c) => getEffectiveStatus(c) === "Pending").length;
  const approvedCount = applications.filter((c) => getEffectiveStatus(c) === "Approved" || getEffectiveStatus(c) === "Signed up").length;
  const declinedCount = applications.filter((c) => getEffectiveStatus(c) === "Declined").length;

  // Fetch applications from API
  const fetchApplications = async () => {
    try {
      setIsLoadingApplications(true);
      setError(null);
      const response = await fetch("/api/applications");
      if (!response.ok) throw new Error("Failed to fetch applications");
      const data = await response.json();
      
      // Map API data to Customer type
      const mappedData = data.map((app: any) => ({
        id: app.id,
        recordNumber: app.recordNumber,
        appType: app.appType.toLowerCase(),
        membership: app.membership.toLowerCase(),
        area: app.area,
        district: app.district,
        barangay: app.barangay,
        firstName: app.firstName,
        middleName: app.middleName,
        lastName: app.lastName,
        suffixName: app.suffixName || "",
        birthdate: app.birthdate,
        noMiddleName: app.noMiddleName,
        gender: app.gender.toLowerCase(),
        civilStatus: app.civilStatus,
        spouseFirst: app.spouseFirst || "",
        spouseMiddle: app.spouseMiddle || "",
        spouseLast: app.spouseLast || "",
        spouseSuffix: app.spouseSuffix || "",
        spouseBirthdate: app.spouseBirthdate || "",
        residenceAddress: app.residenceAddress,
        cellphone: app.cellphone,
        landline: app.landline || "",
        email: app.email,
        privacyConsent: app.privacyConsent,
        privacyNewsletter: app.privacyNewsletter,
        privacyEmail: app.privacyEmail,
        privacySms: app.privacySms,
        privacyPhone: app.privacyPhone,
        privacySocial: app.privacySocial,
        cosignatory: app.cosignatory || "",
        witness: app.witness || "",
        status: app.status === "SIGNED_UP" ? "Signed up" : 
                app.status === "PENDING" ? "Pending" :
                app.status === "APPROVED" ? "Approved" :
                app.status === "DECLINED" ? "Declined" : app.status,
        orNumber: app.orNumber,
        dateIssued: app.dateIssued,
        notes: app.notes || "",
      }));
      
      setApplications(mappedData);
    } catch (err) {
      console.error("Error fetching applications:", err);
      setError("Failed to load applications");
      // Fallback to mock data on error
      setApplications(mockCustomers);
    } finally {
      setIsLoadingApplications(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/admin-login");
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin-login");
    }
  }, [status, router]);

  // Fetch applications on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchApplications();
    }
  }, [status]);

  // Load theme from localStorage on mount; persist when changed
  useEffect(() => {
    const stored = localStorage.getItem("admin-theme") as Theme | null;
    if (stored === "dark" || stored === "light") setTheme(stored);
  }, []);
  useEffect(() => {
    localStorage.setItem("admin-theme", theme);
    if (theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [theme]);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showApplications =
    activeNav === "dashboard" || activeNav === "pending" || activeNav === "approved" || activeNav === "declined";
  const listCustomers =
    activeNav === "dashboard"
      ? applications
      : activeNav === "pending"
        ? applications.filter((c) => getEffectiveStatus(c) === "Pending")
        : activeNav === "approved"
          ? applications.filter((c) => getEffectiveStatus(c) === "Approved" || getEffectiveStatus(c) === "Signed up")
          : activeNav === "declined"
            ? applications.filter((c) => getEffectiveStatus(c) === "Declined")
            : applications;

  const effectiveSelected =
    selected
      ? (customerEdits[selected.id] ?? { ...selected, status: getEffectiveStatus(selected) })
      : null;

  const handleApprove = async (c: Customer) => {
    try {
      const response = await fetch(`/api/applications/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });

      if (!response.ok) throw new Error("Failed to approve application");

      setStatusOverrides((prev) => ({ ...prev, [c.id]: "Approved" }));
      setSelected(null);
      setApproveModalOpen(false);
      setSuccessModalOpen(true);
      
      // Refresh applications
      await fetchApplications();
    } catch (err) {
      console.error("Error approving application:", err);
      alert("Failed to approve application. Please try again.");
    }
  };

  const handleDecline = async (c: Customer) => {
    try {
      const response = await fetch(`/api/applications/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      });

      if (!response.ok) throw new Error("Failed to decline application");

      setStatusOverrides((prev) => ({ ...prev, [c.id]: "Declined" }));
      setSelected(null);
      setDeclineModalOpen(false);
      
      // Refresh applications
      await fetchApplications();
    } catch (err) {
      console.error("Error declining application:", err);
      alert("Failed to decline application. Please try again.");
    }
  };

  const handleDoneEdit = async (draft: Customer) => {
    try {
      const response = await fetch(`/api/applications/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          ...draft,
          appType: draft.appType.toUpperCase(),
          membership: draft.membership.toUpperCase(),
          gender: draft.gender.toUpperCase(),
          status: draft.status === "Signed up" ? "SIGNED_UP" :
                  draft.status === "Pending" ? "PENDING" :
                  draft.status === "Approved" ? "APPROVED" :
                  draft.status === "Declined" ? "DECLINED" : draft.status,
        }),
      });

      if (!response.ok) throw new Error("Failed to update application");

      setCustomerEdits((prev) => ({ ...prev, [draft.id]: draft }));
      setDetailEditMode(false);
      
      // Refresh applications
      await fetchApplications();
    } catch (err) {
      console.error("Error updating application:", err);
      alert("Failed to update application. Please try again.");
    }
  };

  const handleView = (c: Customer) => {
    setSelected(c);
    const status = getEffectiveStatus(c);
    if (status === "Pending") setActiveNav("pending");
    else if (status === "Declined") setActiveNav("declined");
    else if (status === "Approved" || status === "Signed up") setActiveNav("approved");
    else setActiveNav("dashboard");
  };

  const modalOverlayClass = "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4";
  const modalPanelClass = theme === "dark"
    ? "rounded-xl border border-slate-600 bg-slate-800 p-6 shadow-xl max-w-md w-full"
    : "rounded-xl border border-slate-200 bg-white p-6 shadow-xl max-w-md w-full";
  const modalTitleClass = theme === "dark" ? "text-lg font-semibold text-white" : "text-lg font-semibold text-slate-800";
  const modalBodyClass = theme === "dark" ? "mt-2 text-slate-300" : "mt-2 text-slate-600";
  const modalFooterClass = "mt-6 flex justify-end gap-2";

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (redirect will happen in useEffect)
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${
        theme === "dark" ? "bg-slate-900" : "bg-[#e8eaf0]"
      }`}
    >
      {/* Approve confirmation modal */}
      {approveModalOpen && effectiveSelected && (
        <div className={modalOverlayClass} onClick={() => setApproveModalOpen(false)}>
          <div className={modalPanelClass} onClick={(e) => e.stopPropagation()}>
            <h3 className={modalTitleClass}>Confirm approval</h3>
            <p className={modalBodyClass}>Are you sure you want to approve this application?</p>
            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => setApproveModalOpen(false)}
                className={theme === "dark" ? "rounded-lg border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600" : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleApprove(effectiveSelected)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline confirmation modal */}
      {declineModalOpen && effectiveSelected && (
        <div className={modalOverlayClass} onClick={() => setDeclineModalOpen(false)}>
          <div className={modalPanelClass} onClick={(e) => e.stopPropagation()}>
            <h3 className={modalTitleClass}>Confirm declinement</h3>
            <p className={modalBodyClass}>Are you sure you want to decline this application?</p>
            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => setDeclineModalOpen(false)}
                className={theme === "dark" ? "rounded-lg border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600" : "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDecline(effectiveSelected)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success modal (after approve) */}
      {successModalOpen && (
        <div className={modalOverlayClass} onClick={() => setSuccessModalOpen(false)}>
          <div className={modalPanelClass} onClick={(e) => e.stopPropagation()}>
            <h3 className={modalTitleClass}>Submission submitted</h3>
            <p className={modalBodyClass}>The submission has been submitted successfully.</p>
            <div className={modalFooterClass}>
              <button
                type="button"
                onClick={() => setSuccessModalOpen(false)}
                className={theme === "dark" ? "rounded-lg bg-[#3D45AA] px-4 py-2 text-sm font-medium text-white hover:opacity-90" : "rounded-lg bg-[#3D45AA] px-4 py-2 text-sm font-medium text-white hover:opacity-90"}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar: fixed so it stays visible when main content is scrolled */}
      <aside
        className={`fixed left-0 top-0 z-20 flex h-screen flex-col border-r shadow-sm transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-56 overflow-hidden" : "w-0 overflow-hidden"
        } ${theme === "dark" ? "border-slate-700 bg-slate-800 rounded-r-lg" : "border-slate-200 bg-white rounded-r-lg"}`}
      >
        <div
          className={`flex min-h-[56px] shrink-0 items-center gap-3 border-b px-3 ${
            theme === "dark" ? "border-slate-600" : "border-slate-100"
          }`}
        >
          <Image
            src="/logo_aneco.png"
            alt="ANECO"
            width={44}
            height={44}
            className="shrink-0 object-contain"
          />
          <span
            className={`truncate text-base font-bold ${theme === "dark" ? "text-[#FFF19B]" : "text-[#3D45AA]"}`}
          >
            Admin Panel
          </span>
          <div className="flex flex-1 items-center justify-end min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ease-out hover:bg-[#FFF19B]/50 active:scale-95 ${
                theme === "dark" ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"
              }`}
              aria-label="Toggle sidebar"
            >
              <span className="relative block h-5 w-5">
                <span
                  className={`absolute left-0 right-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
                    sidebarOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0.5"
                  }`}
                />
                <span
                  className={`absolute left-0 right-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
                    sidebarOpen ? "opacity-0" : "top-1/2 -translate-y-1/2"
                  }`}
                />
                <span
                  className={`absolute left-0 right-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-in-out ${
                    sidebarOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0.5"
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-hidden p-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveNav(item.id);
                setSelected(null);
                setDetailEditMode(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ease-out active:scale-[0.98] ${
                activeNav === item.id
                  ? "bg-[#F8843F] text-white shadow-sm"
                  : theme === "dark"
                    ? "text-slate-300 hover:bg-[#FFF19B]/20 hover:text-white"
                    : "text-slate-700 hover:bg-[#FFF19B]/40 hover:text-slate-900"
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main: header + content — margin-left so content doesn't sit under fixed sidebar */}
      <div
        className={`flex min-h-screen min-w-0 flex-col transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? "ml-56" : "ml-0"
        }`}
      >
        {/* Top header: show hamburger only when sidebar is closed */}
        <header
          className={`flex min-h-[56px] items-center gap-4 border-b px-4 shadow-sm ${
            theme === "dark" ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
          }`}
        >
          {!sidebarOpen && (
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-all duration-200 ease-out hover:bg-[#FFF19B]/50 hover:text-slate-900 active:scale-95"
              aria-label="Open sidebar"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <div className="flex flex-1 items-center gap-2">
            <input
              type="search"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`h-10 flex-1 max-w-md rounded-lg border px-3 text-sm transition-all duration-200 ease-out focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "border-slate-600 bg-slate-700 text-slate-100 placeholder:text-slate-400 focus:border-[#FFF19B] focus:ring-[#FFF19B]/20"
                  : "border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-[#3D45AA] focus:ring-[#3D45AA]/20"
              }`}
            />
            <button
              type="button"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ease-out hover:bg-[#F8843F] active:scale-95 ${
                theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
              }`}
              aria-label="Search"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out hover:scale-105 active:scale-95 ${
                theme === "dark" ? "text-slate-300 hover:bg-slate-700" : "text-slate-600 hover:bg-slate-100"
              }`}
              aria-label="Notifications"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F8843F] text-[10px] font-bold text-white">
                1
              </span>
            </button>
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((o) => !o)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 ease-out hover:scale-105 hover:bg-[#F8843F] active:scale-95 ${
                theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
              }`}
                aria-label="Profile and settings"
                aria-expanded={profileMenuOpen}
              >
                {session?.user?.name?.[0]?.toUpperCase() || "A"}
              </button>
              {profileMenuOpen && (
                <div
                  className={`absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border shadow-lg ${
                    theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                  }`}
                >
                  {/* Profile section */}
                  <div
                    className={`border-b p-4 ${theme === "dark" ? "border-slate-600" : "border-slate-100"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
                          theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
                        }`}
                      >
                        {session?.user?.name?.[0]?.toUpperCase() || "A"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-800"}`}
                        >
                          {session?.user?.name || "Admin User"}
                        </p>
                        <p
                          className={`truncate text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                        >
                          {session?.user?.email || "admin@example.com"}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Settings: theme toggle */}
                  <div className="p-3">
                    <p
                      className={`mb-2 text-xs font-medium uppercase tracking-wide ${
                        theme === "dark" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      Settings
                    </p>
                    <div
                      className={`flex items-center justify-between rounded-lg px-3 py-2.5 ${
                        theme === "dark" ? "bg-slate-700/50" : "bg-slate-50"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}
                      >
                        Theme
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={theme === "dark"}
                        onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          theme === "dark"
                            ? "bg-[#FFF19B] focus:ring-[#FFF19B]"
                            : "bg-slate-300 focus:ring-[#3D45AA]"
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                            theme === "dark" ? "translate-x-5" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    <p
                      className={`mt-1.5 text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}
                    >
                      {theme === "light" ? "Light mode" : "Dark mode"}
                    </p>
                    {/* Logout button */}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        theme === "dark"
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-red-50 text-red-600 hover:bg-red-100"
                      }`}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-6xl">
            {effectiveSelected ? (
              <div
                className={`admin-animate-in rounded-2xl border p-4 shadow-sm sm:p-6 ${
                  theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                }`}
              >
                <CustomerDetail
                  customer={effectiveSelected}
                  onBack={() => { setSelected(null); setDetailEditMode(false); }}
                  theme={theme}
                  isEditing={detailEditMode}
                  onEdit={effectiveSelected.status === "Pending" ? () => setDetailEditMode(true) : undefined}
                  onDone={handleDoneEdit}
                  onCancel={() => setDetailEditMode(false)}
                  onApprove={
                    effectiveSelected.status === "Pending"
                      ? () => setApproveModalOpen(true)
                      : undefined
                  }
                  onDecline={
                    effectiveSelected.status === "Pending"
                      ? () => setDeclineModalOpen(true)
                      : undefined
                  }
                />
              </div>
            ) : showApplications ? (
              <div key={activeNav} className="admin-animate-in">
                {/* Metric cards */}
                <div className="mb-6 grid gap-4 grid-cols-1 min-[500px]:grid-cols-2 lg:grid-cols-5">
                  <button
                    type="button"
                    onClick={() => { setActiveNav("dashboard"); setSelected(null); setDetailEditMode(false); }}
                    className={`w-full rounded-xl p-4 text-left shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3D45AA] ${
                      theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
                    }`}
                  >
                    <p className="text-2xl font-bold">{isLoadingApplications ? "..." : applications.length}</p>
                    <p className="mt-1 text-sm font-medium opacity-90">Total Applications</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveNav("pending"); setSelected(null); setDetailEditMode(false); }}
                    className="w-full rounded-xl bg-[#F8843F] p-4 text-left text-white shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F8843F]"
                  >
                    <p className="text-2xl font-bold">{pendingCount}</p>
                    <p className="mt-1 text-sm font-medium opacity-90">Pending</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveNav("approved"); setSelected(null); setDetailEditMode(false); }}
                    className={`w-full rounded-xl p-4 text-left shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3D45AA] ${
                      theme === "dark" ? "bg-[#FFF19B] text-slate-800" : "bg-[#3D45AA] text-white"
                    }`}
                  >
                    <p className="text-2xl font-bold">{approvedCount}</p>
                    <p className="mt-1 text-sm font-medium opacity-90">Approved</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveNav("declined"); setSelected(null); setDetailEditMode(false); }}
                    className={`w-full rounded-xl p-4 text-left shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                      theme === "dark" ? "bg-red-900/80 text-red-100" : "bg-red-600 text-white"
                    }`}
                  >
                    <p className="text-2xl font-bold">{declinedCount}</p>
                    <p className="mt-1 text-sm font-medium opacity-90">Declined</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveNav("dashboard"); setSelected(null); setDetailEditMode(false); }}
                    className="w-full rounded-xl bg-[#F8843F] p-4 text-left text-white shadow-md transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F8843F]"
                  >
                    <p className="text-2xl font-bold">70</p>
                    <p className="mt-1 text-sm font-medium opacity-90">This Month</p>
                    <svg className="mt-2 h-8 w-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>

                {/* Recent Applications card */}
                <div
                  className={`rounded-2xl border p-4 shadow-sm transition-shadow duration-200 md:p-5 hover:shadow-md ${
                    theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <h2
                      className={`text-lg font-bold ${theme === "dark" ? "text-[#FFF19B]" : "text-[#3D45AA]"}`}
                    >
                      {activeNav === "dashboard"
                        ? "Recent Applications"
                        : activeNav === "pending"
                          ? "Pending Applications"
                          : activeNav === "approved"
                            ? "Approved Applications"
                            : "Declined Applications"}
                    </h2>
                    
                  </div>
                  <ApplicationsTable
                    customers={listCustomers}
                    onView={handleView}
                    searchQuery={searchQuery}
                    theme={theme}
                  />
                  {isLoadingApplications && (
                    <div className="flex justify-center items-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                      <p className="ml-3 text-slate-500">Loading applications...</p>
                    </div>
                  )}
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg mt-4">
                      <p className="text-red-600">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : activeNav === "logs" ? (
              <div
                className={`admin-animate-in rounded-2xl border p-8 shadow-sm ${
                  theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                }`}
              >
                <h2
                  className={`mb-4 text-lg font-bold ${theme === "dark" ? "text-[#FFF19B]" : "text-[#3D45AA]"}`}
                >
                  Logs
                </h2>
                <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
                  Activity and audit logs will appear here.
                </p>
              </div>
            ) : (
              <div
                className={`admin-animate-in rounded-2xl border p-8 shadow-sm ${
                  theme === "dark" ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
                }`}
              >
                <h2
                  className={`mb-4 text-lg font-bold ${theme === "dark" ? "text-[#FFF19B]" : "text-[#3D45AA]"}`}
                >
                  Statistics
                </h2>
                <p className={theme === "dark" ? "text-slate-300" : "text-slate-600"}>
                  Charts and statistics will appear here.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
