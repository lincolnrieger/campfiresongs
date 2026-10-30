// The song fields, shared by the submit form, editing your own submission,
// and the reviewer's edit-and-approve form.
import { CATEGORIES, ENERGIES, SECTIONS } from "@/lib/constants";
import { arr, str } from "@/lib/forms";
import type { FieldErrors } from "@/lib/validation";
import { ChoiceGroup, TextArea, TextField } from "./fields";

export function SongFields({
  values: v,
  errors: e,
  defaultCredit = "",
  withNotes = true,
  groupClass,
  lyricsClass,
}: {
  values: Record<string, unknown>;
  errors?: FieldErrors;
  defaultCredit?: string;
  withNotes?: boolean;
  groupClass?: string;
  lyricsClass?: string;
}) {
  return (
    <>
      <section className={groupClass} aria-labelledby="g-song">
        <h2 id="g-song">The song</h2>
        <TextField name="title" label="Song title" required maxLength={120} defaultValue={str(v.title)} errors={e} />
        <TextArea
          name="lyrics"
          label="Words"
          hint="Put each line on its own line, and leave a blank line between verses."
          rows={12}
          required
          maxLength={10000}
          className={lyricsClass}
          defaultValue={str(v.lyrics)}
          errors={e}
        />
        <TextArea
          name="chords"
          label="Chords, or “sung to the tune of…”"
          optional
          rows={3}
          maxLength={3000}
          defaultValue={str(v.chords)}
          errors={e}
        />
        <TextArea
          name="actions"
          label="Actions and how to lead it"
          hint="Hand actions, who calls and who answers, when to speed up. Anything that helps someone lead it for the first time."
          optional
          rows={4}
          maxLength={3000}
          defaultValue={str(v.actions)}
          errors={e}
        />
        <TextField
          name="mediaUrl"
          type="url"
          label="Link to a recording"
          hint="YouTube, Spotify, SoundCloud or Vimeo only."
          optional
          maxLength={300}
          defaultValue={str(v.mediaUrl)}
          errors={e}
        />
      </section>

      <section className={groupClass} aria-labelledby="g-sort">
        <h2 id="g-sort">Sort it</h2>
        <ChoiceGroup type="checkbox" name="categories" label="What kind of song is it?" hint="Pick as many as fit." options={CATEGORIES} defaultValue={arr(v.categories)} errors={e} />
        <ChoiceGroup type="checkbox" name="sections" label="Who's it good for?" options={SECTIONS} defaultValue={arr(v.sections)} errors={e} />
        <ChoiceGroup type="radio" name="energy" label="Energy" hint="Calm for the end of the night, high for when everyone's still bouncing." options={ENERGIES} defaultValue={str(v.energy)} errors={e} />
      </section>

      <section className={groupClass} aria-labelledby="g-from">
        <h2 id="g-from">Where it&rsquo;s from</h2>
        <TextArea
          name="origin"
          label="Who wrote it, or where you learnt it"
          hint="For example: “Traditional”, “Learnt at Cuboree 2023” or “Written by our Venturer unit”."
          optional
          rows={2}
          maxLength={500}
          defaultValue={str(v.origin)}
          errors={e}
        />
        <TextField
          name="creditName"
          label="Name to show on the song"
          hint="A first name or nickname is plenty. Leave it blank to stay anonymous."
          optional
          maxLength={40}
          autoComplete="nickname"
          defaultValue={v.creditName !== undefined ? str(v.creditName) : defaultCredit}
          errors={e}
        />
        {withNotes && (
        <TextArea
          name="notes"
          label="Anything the reviewers should know?"
          hint="Only the review team sees this."
          optional
          rows={3}
          maxLength={1500}
          defaultValue={str(v.notes)}
          errors={e}
        />
        )}
      </section>

    </>
  );
}
