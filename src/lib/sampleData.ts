import { ChatMessage, Lead, Sender } from "./types";
import { runAgent } from "./agent";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function daysAgoAt(now: Date, days: number, hour: number, minute = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

type RawMsg = { sender: Sender; text: string; daysAgo: number; hour: number; minute?: number };

interface RawLead {
  name: string;
  company: string;
  phone: string;
  source: string;
  product: string;
  lastContactDaysAgo: number;
  messages?: RawMsg[];
}

const RAW_LEADS: RawLead[] = [
  {
    name: "Arjun Mehta",
    company: "BluePack Industries",
    phone: "+91 98200 11234",
    source: "Trade Show",
    product: "Shrink Wrap Machine",
    lastContactDaysAgo: 1,
    messages: [
      { sender: "buyer", text: "Hi, we met at the packaging expo last week. Can you send me the price list for your shrink wrap machines?", daysAgo: 4, hour: 11 },
      { sender: "rep", text: "Hi Arjun, great meeting you! Sending the price list now — the ST-450 model fits your volume best.", daysAgo: 4, hour: 11, minute: 20 },
      { sender: "buyer", text: "Thanks, looks good. How much for the ST-450 with the conveyor add-on?", daysAgo: 2, hour: 15 },
      { sender: "rep", text: "That combo is ₹4.8L installed. Want me to send a formal quote?", daysAgo: 2, hour: 15, minute: 30 },
      { sender: "buyer", text: "Yes please, send me the quote. We want to place the order this week if numbers work.", daysAgo: 1, hour: 10 },
    ],
  },
  {
    name: "Priya Sundaram",
    company: "Horizon Foods Pvt Ltd",
    phone: "+91 90080 44521",
    source: "Website",
    product: "Case Sealer",
    lastContactDaysAgo: 9,
    messages: [
      { sender: "rep", text: "Hi Priya, following up from your website enquiry about case sealers for your Chennai plant.", daysAgo: 12, hour: 10 },
      { sender: "buyer", text: "Hi, yes we're evaluating a few vendors. Can you share specs for your automatic case sealer?", daysAgo: 11, hour: 14 },
      { sender: "rep", text: "Sure, sending the spec sheet now — handles up to 25 cartons/min.", daysAgo: 11, hour: 14, minute: 40 },
      { sender: "buyer", text: "Got it, thanks. Let me check with my team and get back to you.", daysAgo: 9, hour: 16 },
    ],
  },
  {
    name: "Rohan Deshmukh",
    company: "Deshmukh Pharma Packaging",
    phone: "+91 99870 22190",
    source: "Referral",
    product: "Carton Erector",
    lastContactDaysAgo: 18,
    messages: [
      { sender: "rep", text: "Hi Rohan, Karan from your team mentioned you're looking at carton erectors. Happy to help!", daysAgo: 20, hour: 9 },
      { sender: "buyer", text: "Hi, yes we need one for our new line. What's the price range?", daysAgo: 19, hour: 12 },
      { sender: "rep", text: "Ranges from ₹6L to ₹9L depending on carton size range. Can share a detailed quote today.", daysAgo: 19, hour: 12, minute: 15 },
      { sender: "buyer", text: "That's too expensive for us right now, we only have budget for next year.", daysAgo: 18, hour: 17 },
    ],
  },
  {
    name: "Sana Iqbal",
    company: "Iqbal Cosmetics Co",
    phone: "+91 98111 33678",
    source: "WhatsApp Inbound",
    product: "Labeling Machine",
    lastContactDaysAgo: 0,
    messages: [
      { sender: "buyer", text: "Hi, I saw your labeling machines on Instagram. Do you have one for round bottles?", daysAgo: 1, hour: 18 },
      { sender: "rep", text: "Hi Sana, yes! The RL-200 handles round bottles 30-120mm diameter. Want a quick demo video?", daysAgo: 1, hour: 18, minute: 25 },
      { sender: "buyer", text: "Yes send it over, also how much does it cost?", daysAgo: 0, hour: 9 },
    ],
  },
  {
    name: "Vivek Nair",
    company: "Nair Agro Exports",
    phone: "+91 97400 56123",
    source: "Cold Call",
    product: "Stretch Wrapper",
    lastContactDaysAgo: 14,
    messages: [
      { sender: "rep", text: "Hi Vivek, following up on our call about pallet stretch wrappers for your export unit.", daysAgo: 16, hour: 11 },
      { sender: "buyer", text: "Hi, we decided to go with another supplier who could deliver faster. Thanks anyway.", daysAgo: 14, hour: 13 },
    ],
  },
  {
    name: "Meera Krishnan",
    company: "Krishnan Dairy Products",
    phone: "+91 98450 77812",
    source: "Trade Show",
    product: "Induction Sealer",
    lastContactDaysAgo: 2,
    messages: [
      { sender: "buyer", text: "Hi, we spoke at the Chennai expo about induction sealers for our milk bottle line.", daysAgo: 6, hour: 10 },
      { sender: "rep", text: "Hi Meera! Yes, the IS-100 would be perfect for your bottle necks. Sending details.", daysAgo: 6, hour: 10, minute: 30 },
      { sender: "buyer", text: "Looks good. We're comparing options with two other vendors, will confirm soon.", daysAgo: 2, hour: 14 },
    ],
  },
  {
    name: "Karthik Subramaniam",
    company: "Subramaniam Textiles",
    phone: "+91 90350 99001",
    source: "Referral",
    product: "Strapping Machine",
    lastContactDaysAgo: 1,
    messages: [
      { sender: "rep", text: "Hi Karthik, following up on strapping machines for your bale packing line.", daysAgo: 3, hour: 10 },
      { sender: "buyer", text: "Hi, yes we need 2 units urgently, our current machine broke down.", daysAgo: 1, hour: 9 },
      { sender: "rep", text: "Understood, I can arrange expedited delivery. Sending a quote for 2 units now.", daysAgo: 1, hour: 9, minute: 20 },
      { sender: "buyer", text: "Great, go ahead and send the proposal. We need this urgently, by next week if possible.", daysAgo: 1, hour: 9, minute: 45 },
    ],
  },
  {
    name: "Ananya Rao",
    company: "Rao Beverages Ltd",
    phone: "+91 99220 41567",
    source: "Website",
    product: "Palletizer",
    lastContactDaysAgo: 22,
    messages: [
      { sender: "rep", text: "Hi Ananya, sharing info on our robotic palletizer as requested on the website.", daysAgo: 25, hour: 11 },
      { sender: "buyer", text: "Thanks, this is on hold for now as we're restructuring the plant layout. Will reach out when ready.", daysAgo: 22, hour: 15 },
    ],
  },
  {
    name: "Farhan Ahmed",
    company: "Ahmed Electronics Packaging",
    phone: "+91 98760 33450",
    source: "LinkedIn",
    product: "Vacuum Packaging Machine",
    lastContactDaysAgo: 5,
    messages: [
      { sender: "buyer", text: "Hi, I'm Farhan from Ahmed Electronics. Need a vacuum packaging machine for circuit board moisture protection.", daysAgo: 8, hour: 9 },
      { sender: "rep", text: "Hi Farhan, the VP-300 is great for ESD-safe vacuum packing. Want me to send specs and pricing?", daysAgo: 8, hour: 9, minute: 15 },
      { sender: "buyer", text: "Yes please, how much for a single unit?", daysAgo: 6, hour: 13 },
      { sender: "rep", text: "₹3.2L for the standard VP-300. Happy to do a live demo over video call too.", daysAgo: 6, hour: 13, minute: 20 },
      { sender: "buyer", text: "Sounds good, let's do a call Monday to see the demo.", daysAgo: 5, hour: 16 },
    ],
  },
  {
    name: "Divya Pillai",
    company: "Pillai Spices Export",
    phone: "+91 97170 88923",
    source: "Trade Show",
    product: "Pouch Packing Machine",
    lastContactDaysAgo: 10,
    messages: [
      { sender: "rep", text: "Hi Divya, great to meet you at the food expo! Following up on pouch packing machines for spice export.", daysAgo: 13, hour: 10 },
      { sender: "buyer", text: "Hi, yes we're interested. Can your machine do multi-head weighing for different spice blends?", daysAgo: 11, hour: 12 },
      { sender: "rep", text: "Yes, the PP-500 has a 10-head weigher, perfect for blend variety. Sending a spec sheet.", daysAgo: 11, hour: 12, minute: 30 },
      { sender: "buyer", text: "Perfect, let me check with my management and get back to you.", daysAgo: 10, hour: 17 },
    ],
  },
  {
    name: "Siddharth Joshi",
    company: "Joshi Auto Components",
    phone: "+91 98220 65478",
    source: "Cold Call",
    product: "Carton Erector",
    lastContactDaysAgo: 30,
    messages: [
      { sender: "rep", text: "Hi Siddharth, checking in on the carton erector enquiry from last month.", daysAgo: 30, hour: 11 },
    ],
  },
  {
    name: "Neha Agarwal",
    company: "Agarwal Home Essentials",
    phone: "+91 99680 12309",
    source: "WhatsApp Inbound",
    product: "Shrink Wrap Machine",
    lastContactDaysAgo: 3,
    messages: [
      { sender: "buyer", text: "Hi, do you have a compact shrink wrap machine for a small warehouse? Space is limited.", daysAgo: 5, hour: 14 },
      { sender: "rep", text: "Hi Neha, the ST-150 compact model only needs 6x4 ft of floor space. Want the brochure?", daysAgo: 5, hour: 14, minute: 20 },
      { sender: "buyer", text: "Yes, also need some time to check our floor plan before deciding.", daysAgo: 3, hour: 10 },
    ],
  },
  {
    name: "Aditya Bhatt",
    company: "Bhatt Chemicals",
    phone: "+91 90990 54312",
    source: "Referral",
    product: "Drum Filling Machine",
    lastContactDaysAgo: 7,
    messages: [
      { sender: "rep", text: "Hi Aditya, following up on the drum filling machine we discussed for your chemical unit.", daysAgo: 9, hour: 10 },
      { sender: "buyer", text: "Hi, we're not a good fit right now — switching to a different drum size standard.", daysAgo: 7, hour: 11 },
    ],
  },
  {
    name: "Ritu Chawla",
    company: "Chawla Packaging Solutions",
    phone: "+91 98730 29981",
    source: "Website",
    product: "Case Sealer",
    lastContactDaysAgo: 0,
    messages: [
      { sender: "buyer", text: "Hi, requesting a quote for 2 automatic case sealers for our new unit.", daysAgo: 0, hour: 8 },
      { sender: "rep", text: "Hi Ritu, happy to help — sending pricing for 2 units of the CS-200 now.", daysAgo: 0, hour: 8, minute: 30 },
      { sender: "buyer", text: "Great, if the numbers work we're ready to order by this week.", daysAgo: 0, hour: 9 },
    ],
  },
  {
    name: "Imran Shaikh",
    company: "Shaikh Logistics Packaging",
    phone: "+91 97690 44218",
    source: "LinkedIn",
    product: "Strapping Machine",
    lastContactDaysAgo: 16,
    messages: [
      { sender: "rep", text: "Hi Imran, sharing strapping machine options for your logistics hub as discussed.", daysAgo: 18, hour: 9 },
      { sender: "buyer", text: "Please remove me from this list, we've already signed with another vendor.", daysAgo: 16, hour: 10 },
    ],
  },
  {
    name: "Pooja Verma",
    company: "Verma Organic Foods",
    phone: "+91 98010 67234",
    source: "Trade Show",
    product: "Pouch Packing Machine",
    lastContactDaysAgo: 4,
  },
  {
    name: "Rajesh Kulkarni",
    company: "Kulkarni Industrial Supplies",
    phone: "+91 99230 81567",
    source: "Cold Call",
    product: "Palletizer",
    lastContactDaysAgo: 0,
  },
  {
    name: "Tanvi Oberoi",
    company: "Oberoi Fashion House",
    phone: "+91 98200 93481",
    source: "Website",
    product: "Shrink Wrap Machine",
    lastContactDaysAgo: 1,
  },
  {
    name: "Suresh Pawar",
    company: "Pawar Hardware Traders",
    phone: "+91 97420 11890",
    source: "Referral",
    product: "Strapping Machine",
    lastContactDaysAgo: 0,
  },
  {
    name: "Kavya Reddy",
    company: "Reddy Fresh Produce",
    phone: "+91 90630 55129",
    source: "WhatsApp Inbound",
    product: "Vacuum Packaging Machine",
    lastContactDaysAgo: 2,
  },
];

export function generateSampleLeads(now: Date = new Date()): Lead[] {
  return RAW_LEADS.map((raw) => {
    const chat: ChatMessage[] = (raw.messages ?? []).map((m) => ({
      id: nextId("msg"),
      sender: m.sender,
      text: m.text,
      date: daysAgoAt(now, m.daysAgo, m.hour, m.minute),
    }));

    const agentResult = runAgent(
      {
        name: raw.name,
        product: raw.product,
        lastContactDate: daysAgoAt(now, raw.lastContactDaysAgo, 10),
        chat,
      },
      now
    );

    const lead: Lead = {
      id: nextId("lead"),
      name: raw.name,
      company: raw.company,
      phone: raw.phone,
      source: raw.source,
      product: raw.product,
      createdAt: daysAgoAt(now, raw.lastContactDaysAgo + 1, 9),
      lastContactDate: daysAgoAt(now, raw.lastContactDaysAgo, 10),
      chat,
      tag: agentResult.tag,
      reason: agentResult.reason,
      nextFollowUpDate: agentResult.nextFollowUpDate,
      draftMessage: agentResult.draftMessage,
      draftEditedByRep: false,
      lastSentAt: null,
    };
    return lead;
  });
}
