// The song fields, shared by the add-a-song form, editing your own submission,
// and the reviewer's fix-and-approve form. The essentials come first; the
// rest sits under "Add more" so the form stays short.
import { CATEGORIES, ENERGIES, SECTIONS } from "@/lib/constants";
import { arr, str } from "@/lib/forms";
import type { FieldErrors } from "@/lib/validation";
import { ChoiceGroup, TextArea, TextField } from "./fields";
import styles from "./SongFields.module.css";

const EXTRAS = ["chords", "actions", "mediaUrl", "origin", "creditName", "notes"];

export function SongFields({
  values: v,
  errors: e,
  defaultCredit = "",
  withNotes = true,
}: {
  values: Record<string, unknown>;
  errors?: FieldErrors;
  defaultCredit?: string;
  withNotes?: boolean;
}) {
  // Open the extras if any of them has something in it or has a problem.
  // (A credit name that's just the pre-filled display name doesn't count.)
  const openExtras = EXTRAS.some(
    (k) => e?.[k] || (typeof v[k] === "string" && v[k] !== "" && !(k === "creditName" && v[k] === defaultCredit)),
  );
  return (
    <>
      <TextField name="title" label="Song title" required maxLength={120} defaultValue={str(v.title)} errors={e} />
      <TextArea
        name="lyrics"
        label="Words"
        hint="Put each line on its own line, with a blank line between verses."
        rows={10}
        required
        maxLength={10000}
        className={styles.lyrics}
        defaultValue={str(v.lyrics)}
        errors={e}
      />
      <ChoiceGroup type="checkbox" name="categories" label="What kind of song?" options={CATEGORIES} defaultValue={arr(v.categories)} errors={e} />
      <ChoiceGroup type="checkbox" name="sections" label="Who's it for?" options={SECTIONS} defaultValue={arr(v.sections)} errors={e} />
      <ChoiceGroup type="radio" name="energy" label="Energy" options={ENERGIES} defaultValue={str(v.energy)} errors={e} />

      <details className={styles.extras} open={openExtras}>
        <summary>Add more <span className="optional">(chords, actions, a recording, credit)</span></summary>
        <div className={styles.extrasBody}>
          <TextArea name="chords" label="Chords, or “sung to the tune of…”" optional rows={3} maxLength={3000} defaultValue={str(v.chords)} errors={e} />
          <TextArea
            name="actions"
            label="Actions and how to lead it"
            optional
            rows={3}
            maxLength={3000}
            defaultValue={str(v.actions)}
            errors={e}
          />
          <TextField
            name="mediaUrl"
            type="url"
            label="Link to a recording"
            hint="YouTube, Spotify, SoundCloud or Vimeo."
            optional
            maxLength={300}
            defaultValue={str(v.mediaUrl)}
            errors={e}
          />
          <TextField
            name="origin"
            label="Who wrote it, or where you learnt it"
            hint="For example “Traditional” or “Learnt at Jamboree”."
            optional
            maxLength={500}
            defaultValue={str(v.origin)}
            errors={e}
          />
          <TextField
            name="creditName"
            label="Name to show on the song"
            hint="A first name or nickname. Leave blank to stay anonymous."
            optional
            maxLength={40}
            autoComplete="nickname"
            defaultValue={v.creditName !== undefined ? str(v.creditName) : defaultCredit}
            errors={e}
          />
          {withNotes && (
            <TextArea
              name="notes"
              label="Note for the reviewers"
              hint="Only the review team sees this."
              optional
              rows={2}
              maxLength={1500}
              defaultValue={str(v.notes)}
              errors={e}
            />
          )}
        </div>
      </details>
    </>
  );
}
