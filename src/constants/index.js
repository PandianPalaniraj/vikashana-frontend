// ── App-wide constants ─────────────────────────────────────────────────────
export const ROLES          = ['Super Admin', 'Teacher', 'Student', 'Parent']
export const SECTIONS       = ['A', 'B', 'C', 'D']
export const BLOOD_GROUPS   = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
export const GENDERS        = ['Male', 'Female', 'Other']
export const ACADEMIC_YEARS = ['2024-25', '2023-24']
export const PAYMENT_MODES  = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'DD']
export const EXAM_TYPES     = ['FA1', 'FA2', 'SA1', 'SA2', 'Unit Test', 'Half Yearly', 'Annual']
export const SUBJECTS       = ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies', 'Computer', 'Sanskrit']

export const SCHOOL = {
  name:    'Vidya Niketan School',
  address: '123, MG Road, Pune - 411001',
  phone:   '020-12345678',
  email:   'info@vidyaniketan.edu.in',
}

// ── Seed students ──────────────────────────────────────────────────────────
export const INITIAL_STUDENTS = [
  { id:'SMS001', name:'Aarav Sharma',       class:'10', section:'A', gender:'Male',   dob:'2009-03-12', guardian:'Rajesh Sharma',   phone:'9876543210', status:'Active',   bloodGroup:'B+'  },
  { id:'SMS002', name:'Priya Patel',         class:'9',  section:'B', gender:'Female', dob:'2010-07-22', guardian:'Suresh Patel',    phone:'9823456789', status:'Active',   bloodGroup:'O+'  },
  { id:'SMS003', name:'Mohammed Irfan',      class:'10', section:'A', gender:'Male',   dob:'2009-11-05', guardian:'Abdul Irfan',     phone:'9745632108', status:'Active',   bloodGroup:'A+'  },
  { id:'SMS004', name:'Kavya Nair',          class:'8',  section:'C', gender:'Female', dob:'2011-01-18', guardian:'Vijayan Nair',    phone:'9654321087', status:'Inactive', bloodGroup:'AB+' },
  { id:'SMS005', name:'Rohan Gupta',         class:'11', section:'A', gender:'Male',   dob:'2008-06-30', guardian:'Amit Gupta',      phone:'9567890123', status:'Active',   bloodGroup:'B-'  },
  { id:'SMS006', name:'Rahul Das',           class:'9',  section:'B', gender:'Male',   dob:'2010-03-15', guardian:'Subir Das',       phone:'9765432109', status:'Active',   bloodGroup:'O-'  },
  { id:'SMS007', name:'Sneha Reddy',         class:'10', section:'A', gender:'Female', dob:'2009-08-22', guardian:'Ravi Reddy',      phone:'9876012345', status:'Active',   bloodGroup:'A+'  },
  { id:'SMS008', name:'Siddharth Kulkarni',  class:'8',  section:'C', gender:'Male',   dob:'2011-05-10', guardian:'Rajan Kulkarni',  phone:'9812345670', status:'Active',   bloodGroup:'B+'  },
  { id:'SMS009', name:'Vikram Iyer',         class:'10', section:'A', gender:'Male',   dob:'2009-12-01', guardian:'Suresh Iyer',     phone:'9923456700', status:'Active',   bloodGroup:'O+'  },
  { id:'SMS010', name:'Pooja Nambiar',       class:'9',  section:'B', gender:'Female', dob:'2010-09-14', guardian:'Nair Nambiar',    phone:'9834567801', status:'Active',   bloodGroup:'AB-' },
  { id:'SMS011', name:'Tanvi Joshi',         class:'10', section:'A', gender:'Female', dob:'2009-04-20', guardian:'Deepak Joshi',    phone:'9745678902', status:'Active',   bloodGroup:'A-'  },
  { id:'SMS012', name:'Ananya Bose',         class:'8',  section:'C', gender:'Female', dob:'2011-07-08', guardian:'Tapan Bose',      phone:'9656789003', status:'Active',   bloodGroup:'B+'  },
]

// ── Default classes ────────────────────────────────────────────────────────
export const INITIAL_CLASSES = [
  { id:'c8',  name:'8',  active:true },
  { id:'c9',  name:'9',  active:true },
  { id:'c10', name:'10', active:true },
  { id:'c11', name:'11', active:true },
]

// ── Default fee types ──────────────────────────────────────────────────────
export const INITIAL_FEE_TYPES = [
  { id:'ft1', name:'Tuition Fee',    defaultAmounts:{ '8':1200, '9':1400, '10':1600, '11':1800 }, active:true  },
  { id:'ft2', name:'Exam Fee',       defaultAmounts:{ '8':500,  '9':500,  '10':600,  '11':600  }, active:true  },
  { id:'ft3', name:'Library Fee',    defaultAmounts:{ '8':200,  '9':200,  '10':200,  '11':200  }, active:true  },
  { id:'ft4', name:'Sports Fee',     defaultAmounts:{ '8':300,  '9':300,  '10':300,  '11':300  }, active:true  },
  { id:'ft5', name:'Transport Fee',  defaultAmounts:{ '8':800,  '9':800,  '10':900,  '11':900  }, active:false },
  { id:'ft6', name:'Computer Fee',   defaultAmounts:{ '8':400,  '9':400,  '10':400,  '11':500  }, active:true  },
  { id:'ft7', name:'Annual Charges', defaultAmounts:{ '8':2000, '9':2000, '10':2500, '11':2500 }, active:true  },
]

// ── Marks config ───────────────────────────────────────────────────────────
export const MAX_MARKS = {
  FA1:25, FA2:25, SA1:100, SA2:100, 'Unit Test':20, 'Half Yearly':100, Annual:100,
}

export const FEE_STATUS_META = {
  Draft:   { c: '#64748B', bg: '#F1F5F9', l: 'Draft'   },
  Sent:    { c: '#3B82F6', bg: '#EFF6FF', l: 'Sent'    },
  Unpaid:  { c: '#3B82F6', bg: '#EFF6FF', l: 'Unpaid'  },
  Paid:    { c: '#059669', bg: '#D1FAE5', l: 'Paid'    },
  Partial: { c: '#D97706', bg: '#FEF3C7', l: 'Partial' },
  Overdue: { c: '#DC2626', bg: '#FEE2E2', l: 'Overdue' },
}

export const PAGE_SIZE = 10

// ── Default teachers ───────────────────────────────────────────────────────
export const INITIAL_TEACHERS = [
  { id:'TCH001', name:'Ramesh Iyer',       gender:'Male',   dob:'1982-05-14', phone:'9876501234', email:'ramesh@vidyaniketan.edu.in',  designation:'Head of Department', qualification:'M.Sc B.Ed', joinDate:'2010-06-01', subjects:['Mathematics','Science'],              classes:['9','10'],          sections:['A','B'],         status:'Active',   bloodGroup:'B+',  address:'12, Shivaji Nagar, Pune', photo:null, docs:[], empId:'EMP001' },
  { id:'TCH002', name:'Sunita Sharma',     gender:'Female', dob:'1988-09-22', phone:'9812340987', email:'sunita@vidyaniketan.edu.in',   designation:'Senior Teacher',     qualification:'M.A B.Ed',  joinDate:'2013-07-15', subjects:['English','Hindi'],                    classes:['8','9'],           sections:['A','B','C'],     status:'Active',   bloodGroup:'O+',  address:'34, Kothrud, Pune',       photo:null, docs:[], empId:'EMP002' },
  { id:'TCH003', name:'Pradeep Kumar',     gender:'Male',   dob:'1979-03-30', phone:'9745601234', email:'pradeep@vidyaniketan.edu.in',  designation:'Teacher',            qualification:'B.Sc B.Ed', joinDate:'2008-04-01', subjects:['Science','Computer'],                 classes:['10','11'],         sections:['A'],             status:'Active',   bloodGroup:'A+',  address:'56, Aundh, Pune',         photo:null, docs:[], empId:'EMP003' },
  { id:'TCH004', name:'Meena Patil',       gender:'Female', dob:'1991-11-08', phone:'9654307654', email:'meena@vidyaniketan.edu.in',    designation:'Teacher',            qualification:'B.Ed',      joinDate:'2016-06-20', subjects:['Social Studies','Hindi'],             classes:['8','9','10'],      sections:['B','C'],         status:'Active',   bloodGroup:'AB+', address:'78, Baner, Pune',         photo:null, docs:[], empId:'EMP004' },
  { id:'TCH005', name:'Arvind Nair',       gender:'Male',   dob:'1985-07-17', phone:'9567803456', email:'arvind@vidyaniketan.edu.in',   designation:'Senior Teacher',     qualification:'M.Sc B.Ed', joinDate:'2011-07-01', subjects:['Mathematics'],                        classes:['11'],              sections:['A'],             status:'Active',   bloodGroup:'B-',  address:'90, Wakad, Pune',         photo:null, docs:[], empId:'EMP005' },
  { id:'TCH006', name:'Kavita Joshi',      gender:'Female', dob:'1993-02-25', phone:'9876512345', email:'kavita@vidyaniketan.edu.in',   designation:'Teacher',            qualification:'B.A B.Ed',  joinDate:'2018-06-15', subjects:['English','Sanskrit'],                 classes:['8','9'],           sections:['A','B'],         status:'Active',   bloodGroup:'O-',  address:'11, Koregaon Park, Pune', photo:null, docs:[], empId:'EMP006' },
  { id:'TCH007', name:'Suresh Desai',      gender:'Male',   dob:'1976-12-10', phone:'9812356789', email:'suresh@vidyaniketan.edu.in',   designation:'Sports Coach',       qualification:'B.Ed',      joinDate:'2005-04-01', subjects:['Computer'],                           classes:['8','9','10','11'], sections:['A','B','C','D'], status:'On Leave', bloodGroup:'A-',  address:'22, Hadapsar, Pune',      photo:null, docs:[], empId:'EMP007' },
  { id:'TCH008', name:'Anjali Mehta',      gender:'Female', dob:'1989-06-03', phone:'9745678901', email:'anjali@vidyaniketan.edu.in',   designation:'Teacher',            qualification:'M.A B.Ed',  joinDate:'2014-07-10', subjects:['Hindi','Sanskrit','Social Studies'],   classes:['10','11'],         sections:['A','B'],         status:'Active',   bloodGroup:'B+',  address:'33, Viman Nagar, Pune',   photo:null, docs:[], empId:'EMP008' },
]