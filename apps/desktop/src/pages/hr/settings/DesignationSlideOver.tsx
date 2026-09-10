import { useState, useEffect } from "react";
import { Button, TextField, TextAreaField, useToast } from "@/shared";
import { SlideOver, SlideOverHeader, SlideOverContent, SlideOverFooter } from "@/shared/components/ui/SlideOver";
import { hrApi } from "@/shared/lib/core";

type Props = {
  designation?: any; // true for create, or object for edit
  onClose: () => void;
  onSaved: () => void;
};

export default function DesignationSlideOver({ designation, onClose, onSaved }: Props) {
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEdit = typeof designation === "object" && designation !== null;

  useEffect(() => {
    if (isEdit) {
      setName(designation.name || "");
      setCode(designation.code || "");
      setDescription(designation.description || "");
      setJobDescription(designation.job_description || "");
    } else {
      setName("");
      setCode("");
      setDescription("");
      setJobDescription("");
    }
  }, [designation]);

  async function handleSave() {
    if (!name.trim()) {
      showToast({ tone: "warning", title: "Validation", message: "Name is required." });
      return;
    }

    try {
      setSubmitting(true);
      if (isEdit) {
        await hrApi.updateDesignation(designation.id, {
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          job_description: jobDescription,
        });
        showToast({ tone: "success", title: "Saved", message: "Job title designation updated successfully." });
      } else {
        await hrApi.createDesignation({
          name: name.trim(),
          code: code.trim() || undefined,
          description: description.trim() || undefined,
          job_description: jobDescription,
        });
        showToast({ tone: "success", title: "Created", message: "Job title designation created successfully." });
      }
      onSaved();
    } catch (err: any) {
      showToast({ tone: "danger", title: "Failed", message: err?.message || "Failed to save designation" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SlideOver open={designation !== false} onClose={onClose}>
      <SlideOverHeader
        title={isEdit ? `Edit Job Title: ${designation.name}` : "Add Job Title Designation"}
        onClose={onClose}
      />
      <SlideOverContent className="space-y-4">
        <TextField
          label="Name (Job Title)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Senior Software Engineer"
          required
        />
        <TextField
          label="Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g., ENG-03"
        />
        <TextField
          label="Brief Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short internal summary of role grade..."
        />
        <TextAreaField
          label="Job Description Template"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Detailed role expectations, responsibilities, reporting lines, and skills template..."
          rows={10}
        />
      </SlideOverContent>
      <SlideOverFooter>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={submitting}>
            {submitting ? "Saving..." : "Save Job Title"}
          </Button>
        </div>
      </SlideOverFooter>
    </SlideOver>
  );
}
