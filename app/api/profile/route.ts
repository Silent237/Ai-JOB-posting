import { NextResponse } from 'next/server';
import { getProfile, saveProfile, MasterTemplate } from '@/lib/db';
import { parseLaTeXCV } from '@/lib/latex-parser';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = getProfile();
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { masterLaTeX, updatedProfile, action, templateTitle, templateId } = body;

    let profile = getProfile();

    if (action === 'save_template' && masterLaTeX) {
      const parsed = parseLaTeXCV(masterLaTeX);
      if (!parsed.templates) parsed.templates = [];

      const targetId = templateId || `tpl_${Date.now()}`;
      const existingIdx = parsed.templates.findIndex((t) => t.id === targetId);

      const newTpl: MasterTemplate = {
        id: targetId,
        title: templateTitle || 'Master Resume Template',
        latex: masterLaTeX,
        isDefault: parsed.templates.length === 0 || targetId === parsed.activeTemplateId,
      };

      if (existingIdx >= 0) {
        parsed.templates[existingIdx] = newTpl;
      } else {
        parsed.templates.push(newTpl);
      }

      parsed.activeTemplateId = targetId;
      const saved = saveProfile(parsed);
      return NextResponse.json({ success: true, profile: saved });
    }

    if (action === 'set_active' && templateId && profile) {
      profile.activeTemplateId = templateId;
      const tpl = profile.templates?.find((t) => t.id === templateId);
      if (tpl) {
        const reParsed = parseLaTeXCV(tpl.latex);
        reParsed.templates = profile.templates;
        reParsed.activeTemplateId = templateId;
        const saved = saveProfile(reParsed);
        return NextResponse.json({ success: true, profile: saved });
      }
    }

    if (masterLaTeX) {
      const parsed = parseLaTeXCV(masterLaTeX);
      const saved = saveProfile(parsed);
      return NextResponse.json({ success: true, profile: saved });
    }

    if (updatedProfile) {
      const saved = saveProfile(updatedProfile);
      return NextResponse.json({ success: true, profile: saved });
    }

    return NextResponse.json({ error: 'No LaTeX source or profile data provided' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
