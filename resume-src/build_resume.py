"""Build assets/JohnBosco_J_Resume.pdf.

Run with a Python that has reportlab installed:
    python resume-src/build_resume.py
Fonts are static instances of Space Grotesk and Manrope (SIL Open Font License) in resume-src/fonts.
"""
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Flowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "resume-src" / "fonts"
OUT = ROOT / "assets" / "JohnBosco_J_Resume.pdf"
PORTFOLIO = "https://johnbosco.vercel.app"

INK, MUTED, SOFT = HexColor("#241b2e"), HexColor("#5d5468"), HexColor("#8a8094")
ACCENT, ACCENT_SOFT, RULE, CREAM = HexColor("#b9572a"), HexColor("#f6a25c"), HexColor("#e2d8cd"), HexColor("#fdf3e2")

for name, file in [("Body", "Manrope-400"), ("Body-SemiBold", "Manrope-600"), ("Body-Bold", "Manrope-700"),
                   ("Display", "SpaceGrotesk-500"), ("Display-SemiBold", "SpaceGrotesk-600"), ("Display-Bold", "SpaceGrotesk-700")]:
    pdfmetrics.registerFont(TTFont(name, str(FONTS / f"{file}.ttf")))
pdfmetrics.registerFontFamily("Body", normal="Body", bold="Body-Bold", italic="Body", boldItalic="Body-Bold")

PAGE_W, PAGE_H = A4
# SimpleDocTemplate frames pad 6pt on every side; margins compensate so text sits 12.5mm / 10mm from the edge.
FRAME_PAD = 6
MARGIN_X, MARGIN_TOP, MARGIN_BOTTOM = 12.5 * mm - FRAME_PAD, 10 * mm - FRAME_PAD, 8 * mm - FRAME_PAD
WIDTH = PAGE_W - 2 * MARGIN_X - 2 * FRAME_PAD
DATE_W = 28 * mm

body = ParagraphStyle("body", fontName="Body", fontSize=8.4, leading=10.9, textColor=INK)
meta = ParagraphStyle("meta", parent=body, fontSize=7.9, leading=10.2, textColor=SOFT)
title = ParagraphStyle("title", parent=body, fontName="Display-SemiBold", fontSize=9.2, leading=11.4)
date = ParagraphStyle("date", parent=body, fontName="Display", fontSize=8.2, leading=11.4, textColor=ACCENT, alignment=TA_RIGHT)
bullet = ParagraphStyle("bullet", parent=body, leftIndent=10, bulletIndent=2, bulletFontName="Body-Bold",
                        bulletColor=ACCENT, bulletFontSize=7.6, spaceBefore=.5)
name = ParagraphStyle("name", fontName="Display-Bold", fontSize=23, leading=24, textColor=INK)
tagline = ParagraphStyle("tag", fontName="Display", fontSize=10.2, leading=12.5, textColor=ACCENT, spaceBefore=3)
contact = ParagraphStyle("contact", parent=body, fontSize=8.4, leading=11.4, textColor=MUTED, spaceBefore=4)
label = ParagraphStyle("label", fontName="Display-SemiBold", fontSize=7, leading=9, textColor=SOFT, alignment=TA_RIGHT)
skill_key = ParagraphStyle("skey", parent=body, fontName="Display-SemiBold", fontSize=8.3)


def link(url, text, color="#241b2e"):
    return f'<a href="{url}" color="{color}">{text}</a>'


SEP = '<font color="#8a8094">  ·  </font>'


class Pill(Flowable):
    """Dark rounded badge holding the portfolio link, right-aligned in its cell."""

    def __init__(self, text, url, size=10.5):
        super().__init__()
        self.text, self.url, self.size = text, url, size
        self.tw = pdfmetrics.stringWidth(text, "Display-SemiBold", size)
        self.aw = pdfmetrics.stringWidth(" ↗", "Display-SemiBold", size)
        self.pad_x, self.h = 10, size + 10

    def wrap(self, avail_w, avail_h):
        self.avail_w = avail_w
        return avail_w, self.h

    def draw(self):
        c = self.canv
        w = self.tw + self.aw + 2 * self.pad_x
        x = self.avail_w - w
        c.setFillColor(INK)
        c.roundRect(x, 0, w, self.h, self.h / 2, stroke=0, fill=1)
        c.setFont("Display-SemiBold", self.size)
        c.setFillColor(CREAM)
        c.drawString(x + self.pad_x, 5.6, self.text)
        c.setFillColor(ACCENT_SOFT)
        c.drawString(x + self.pad_x + self.tw, 5.6, " ↗")
        c.linkURL(self.url, (x, 0, x + w, self.h), relative=1)


class TwoToneRule(Flowable):
    def __init__(self, width):
        super().__init__()
        self.width, self.height = width, 1.4

    def draw(self):
        c = self.canv
        c.setLineWidth(1.2)
        c.setStrokeColor(ACCENT)
        c.line(0, 0, self.width * .18, 0)
        c.setStrokeColor(INK)
        c.line(self.width * .18, 0, self.width, 0)


class SectionHead(Flowable):
    """Accent square, letter-spaced caps, and a hairline running to the right edge."""

    def __init__(self, text, width):
        super().__init__()
        self.text, self.width, self.height = text.upper(), width, 11

    def draw(self):
        c = self.canv
        c.setFillColor(ACCENT)
        c.rect(0, 2.2, 7.2, 7.2, stroke=0, fill=1)
        t = c.beginText(12.5, 2.9)
        t.setFont("Display-Bold", 8.4)
        t.setCharSpace(1.35)
        t.setFillColor(INK)
        t.textOut(self.text)
        c.drawText(t)
        end = 12.5 + pdfmetrics.stringWidth(self.text, "Display-Bold", 8.4) + 1.35 * len(self.text) + 6
        c.setStrokeColor(RULE)
        c.setLineWidth(.6)
        c.line(end, 5.8, self.width, 5.8)


def grid(rows, widths, valign="TOP", pad=0):
    t = Table(rows, colWidths=widths)
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), valign),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def entry(role, org, when, stack=None, points=(), detail=None):
    """Title line: role — org · stack, date on the right; optional detail line; then bullets."""
    text = role
    if org:
        text += f' <font name="Display" color="#5d5468">— {org}</font>'
    if stack:
        text += f' <font name="Body" size="7.9" color="#8a8094">  ·  {stack}</font>'
    head = grid([[Paragraph(text, title), Paragraph(when, date)]], [WIDTH - DATE_W, DATE_W])
    parts = [head]
    if detail:
        parts.append(Paragraph(detail, meta))
    parts += [Paragraph(p, bullet, bulletText="•") for p in points]
    return KeepTogether(parts)


def section(heading, *flowables, gap=2.9 * mm):
    return [Spacer(1, gap), SectionHead(heading, WIDTH), Spacer(1, 3.4)] + list(flowables)


def gap(h=1.35 * mm):
    return Spacer(1, h)


story = []
header_left = [
    Paragraph("John Bosco J", name),
    Paragraph("Full-stack developer · Founder, Riven Devs", tagline),
    Paragraph("Chennai, Tamil Nadu" + SEP + "+91 89398 53898" + SEP + link("mailto:mailtojjohnbosco@gmail.com", "mailtojjohnbosco@gmail.com")
              + "<br/>" + link("https://linkedin.com/in/johnbosco-j", "linkedin.com/in/johnbosco-j") + SEP
              + link("https://github.com/johnbosco-j", "github.com/johnbosco-j"), contact),
]
header_right = [Spacer(1, 1.5), Paragraph("P O R T F O L I O", label), Spacer(1, 3.5), Pill("johnbosco.vercel.app", PORTFOLIO)]
story.append(grid([[header_left, header_right]], [WIDTH - 62 * mm, 62 * mm]))
story += [Spacer(1, 3.2 * mm), TwoToneRule(WIDTH)]

story += section("About me", Paragraph(
    "Pre-final year CSE student and full-stack developer who ships real products: sole developer of LICET's CSE department ERP, "
    "founder of Riven Devs, and builder of Clareo (115 automated tests). Skilled in Java, Python, TypeScript, PostgreSQL and applied AI. "
    "Seeking <b>Summer 2027 software engineering internships</b>.", body))

story += section(
    "Education",
    entry("Loyola-ICAM College of Engineering and Technology (LICET), Chennai", "B.E. Computer Science and Engineering", "2024 – 2028",
          detail="CGPA 8.09/10 · Coursework: Data Structures &amp; Algorithms, Operating Systems, DBMS, OOSE, Neural Networks &amp; Deep Learning"),
    gap(1 * mm),
    entry("St. Joseph Matriculation Higher Secondary School, Ambattur", "Class XII", "89% · 2024"),
)

story += section(
    "Experience",
    entry("Sole Developer", "CSE Department ERP (LICET Things), LICET", "Mar 2026 – Present",
          "Next.js · Supabase · PostgreSQL", detail="Live: " + link("https://cseerp.vercel.app", "cseerp.vercel.app", "#b9572a"), points=[
              "Built a 3-role (Student, Faculty, HoD) portal for attendance, marks, timetable, curriculum, exams, placements and leave; now being handed over to the department.",
              "Designed normalized PostgreSQL schemas with Row Level Security and versioned migrations (Course Outcomes CO1–CO6) deployed via Vercel CI/CD.",
              "Fixed a race condition that corrupted concurrent attendance saves; added register locking, XLSX export and CIA 1/2 + SEE mark entry.",
              "HoD dashboard with semester attendance, below-75% alerts, pass rate, per-section daily attendance and faculty workload.",
          ]),
    gap(),
    entry("Founder &amp; Full-Stack Developer", "Riven (Riven Devs)", "Sep 2026 – Present", "Independent software &amp; web studio", [
        "Founded Riven Devs to build websites and software products for clients, handling requirements, design, development and deployment end to end.",
        "Delivered a client website for Lincy's Makeover Artistry.",
        "Turned the EyeGuard hackathon idea into Clareo, Riven's first product, with team accounts, SSO and Razorpay billing.",
    ]),
    gap(),
    entry("Student Contributor", "NBA Accreditation, CSE Department, LICET", "2026", None, [
        "Supported event management, documentation and data handling for the department's NBA accreditation.",
        "Conducted a workshop for 63 first-year students on building effective presentations with AI tools.",
    ]),
)

story += section(
    "Projects",
    entry("Nijam", "Multilingual AI Scam-Defence App", "Pre-launch", "Web · Android · iOS", [
        "Built a multilingual AI scam-detection app for Tamil, Telugu and Kannada-first users; leading launch readiness incl. app-store permissions and compliance.",
    ]),
    gap(),
    entry("Clareo", "On-Device Eye &amp; Fatigue Wellness Coach", "Sep 2026 – Present", "React · TypeScript · FastAPI · PostgreSQL · Electron", [
        "Privacy-first web + Electron app: 100% of camera frames processed on-device in Web Workers; alarm fires ~1.2 s after eyes close.",
        "FastAPI, SQLAlchemy/Alembic, PostgreSQL backend with SSO (Google, GitHub, Microsoft, OIDC) and Razorpay billing.",
        "115 automated tests (61 backend, 54 engine); 12/12 real closed-eye samples detected with 0/46 false positives. Grew from EyeGuard (Top 7, Ctrl+Alt+Hack 2.0).",
    ]),
    gap(),
    entry("NNDL Hub", "Class Community with RAG Assistant", "Sep 2026 – Present", "Next.js 15 · Supabase · Gemini API", [
        "Platform for two CSE sections with roll-number sign-in, forum, materials library and Ask Axon, a Gemini RAG assistant that cites course PDFs and flags out-of-syllabus answers.",
    ]),
    gap(),
    entry("oLearn", "E-Learning Platform", "May 2026",
          "Java · Spring Boot · REST · H2 · " + link("https://github.com/johnbosco-j/oLearn", "github.com/johnbosco-j/oLearn", "#b9572a"), [
              "Led a 4-person team through a 14-day Agile sprint; modelled enrollment as a 6-stage state machine; wrote the SRS and UML.",
          ]),
    gap(),
    entry("Systems Projects", None, "2026",
          "C · Python · WebAssembly · " + link("https://github.com/johnbosco-j/8086-trainer-emulator-ui", "8086 emulator", "#b9572a"), [
              "8086 Trainer Kit Emulator (registers, flags, 16-bit arithmetic); Stockfish chess client via WebAssembly in a Web Worker; OS algorithms in C (Banker's, paging, disk scheduling).",
          ]),
)

skills = [
    ("Languages", "Java, Python, C, TypeScript, JavaScript, SQL"),
    ("Backend", "Spring Boot, FastAPI, REST, WebSockets, SQLAlchemy, Alembic"),
    ("Frontend &amp; Platforms", "React, Next.js, Vite, Tailwind CSS, Electron, Expo"),
    ("Data &amp; Infra", "PostgreSQL, Supabase (Auth, RLS), Vercel CI/CD, Git, GitHub, Linux"),
    ("AI", "RAG, Gemini API, Claude API, MediaPipe, OpenCV"),
    ("Concepts", "DSA, OOP, concurrency, state machines, SSO/OIDC, automated testing"),
]
# Two groups per line keeps the section to three lines.
skill_lines = []
for i in range(0, len(skills), 2):
    pair = [f'<font name="Display-SemiBold">{k}</font>  {v}' for k, v in skills[i:i + 2]]
    skill_lines.append(Paragraph('<font color="#8a8094">   ·   </font>'.join(pair), ParagraphStyle("skill", parent=body, spaceBefore=1)))
story += section("Technical skills", *skill_lines)

half = (WIDTH - 7 * mm) / 2
achievements = [SectionHead("Achievements", half), Spacer(1, 3.4)] + [Paragraph(t, bullet, bulletText="•") for t in [
    "Top 7, Ctrl + Alt + Hack 2.0 (LICET, Mar 2026) — led team EyeGuard",
    "5th place, Buildathon 3.0 (Jan 2026) · Phase 2, BitWorks Hackathon",
    "1st place, Logo Lock — Kranti 2026 national technical symposium (CSI Chennai Chapter)",
]]
certs = [SectionHead("Certifications", half), Spacer(1, 3.4)] + [Paragraph(t, bullet, bulletText="•") for t in [
    "Hedera Certified Developer Associate (HCDA), HCF &amp; HBF — The Hashgraph Association (Aug 2026)",
    "Oracle Database Management Systems · NPTEL German I",
    "Java Fundamentals Placement Training (Bytsone, ongoing)",
]]
pair = grid([[achievements, certs]], [half + 7 * mm, half])
pair.setStyle(TableStyle([("RIGHTPADDING", (0, 0), (0, -1), 7 * mm)]))
story += [Spacer(1, 2.9 * mm), pair]


def build():
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=MARGIN_X, rightMargin=MARGIN_X,
                            topMargin=MARGIN_TOP, bottomMargin=MARGIN_BOTTOM,
                            title="John Bosco J - Resume", author="John Bosco J",
                            subject="Resume · Portfolio: johnbosco.vercel.app", creator="John Bosco J")
    doc.build(story)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    build()
