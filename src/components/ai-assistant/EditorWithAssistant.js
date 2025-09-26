import React, { useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import AIAssistantBar from './AIAssistantBar';

const EditorWithAssistant = () => {
  const editorRef = useRef(null);

  return (
    <div>
      <AIAssistantBar editorRef={editorRef} />
      <Editor
        apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
        onInit={(evt, editor) => {
          editorRef.current = editor;
        }}
        initialValue="<p>Highlight text and ask the AI to transform it, or insert new content ✨</p>"
        init={{
          height: 520,
          menubar: true,
          plugins: [
            'advlist autolink lists link charmap preview anchor',
            'searchreplace visualblocks code fullscreen',
            'insertdatetime media table help wordcount',
          ],
          toolbar:
            'undo redo | formatselect | bold italic backcolor | ' +
            'alignleft aligncenter alignright alignjustify | ' +
            'bullist numlist outdent indent | removeformat | help',
        }}
      />
    </div>
  );
};

export default EditorWithAssistant;
