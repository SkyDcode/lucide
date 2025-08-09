// frontend/src/modules/export/components/ReportGenerator.jsx
import React, { useState } from 'react';
import Button from '../../../components/ui/Button/Button';
import ExportModal from './ExportModal';

export default function ReportGenerator({ folderId, entityId }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Exporter…</Button>
      <ExportModal open={open} onClose={() => setOpen(false)} folderId={folderId} entityId={entityId} />
    </>
  );
}