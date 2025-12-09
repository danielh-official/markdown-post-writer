'use client';

// MARK: Imports

import MDEditor from '@uiw/react-md-editor';
import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import yaml from 'js-yaml';

interface YamlField {
  id: number;
  label: string;
  value: string | number | boolean | null | string[];
  order: number;
  type: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'list';
}

// MARK: Main Component

export default function MarkdownPostWriter() {
  // MARK: State

  const [isClient, setIsClient] = useState(false);

  const [yamlFields, setYamlFields] = useState<YamlField[]>([]);
  const [yamlIsHidden, setYamlIsHidden] = useState<boolean>(false);
  const [markdownContent, setMarkdownContent] = useState<string>('');

  // MARK: Effects

  const initialRender = useRef(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true);

    const yamlFields = localStorage.getItem('yamlFields');
    if (yamlFields) {
      setYamlFields(JSON.parse(yamlFields));
    }
    const value = localStorage.getItem('markdownContent');
    if (value) {
      setMarkdownContent(value);
    }
    const yamlIsHidden = localStorage.getItem('yamlIsHidden');
    if (yamlIsHidden) {
      setYamlIsHidden(JSON.parse(yamlIsHidden));
    }
  }, []);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }

    localStorage.setItem('yamlFields', JSON.stringify(yamlFields));
    localStorage.setItem('markdownContent', markdownContent);
    localStorage.setItem('yamlIsHidden', JSON.stringify(yamlIsHidden));
  }, [yamlFields, markdownContent, yamlIsHidden]);

  // MARK: Handlers

  function addYamlField() {
    setYamlFields([
      ...yamlFields,
      {
        id: Date.now(),
        label: '',
        type: 'text',
        value: null,
        order: yamlFields.length,
      },
    ]);
  }

  function exportProperties() {
    const config = yamlFields.map((field) => ({
      label: field.label,
      type: field.type,
      value: field.value,
      order: field.order,
    }));

    const jsonContent = JSON.stringify(config, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'markdown-post-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importProperties(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = yaml.load(content, {
          schema: yaml.CORE_SCHEMA,
        }) as {
          yamlFields: Array<{
            label: string;
            type: YamlField['type'];
            value: string | number | boolean | null | string[];
            order: number;
          }>;
        };

        if (config && config.yamlFields && Array.isArray(config.yamlFields)) {
          const baseTimestamp = Date.now();
          const importedFields = config.yamlFields.map((field, index) => ({
            id: baseTimestamp * 1000 + index,
            label: field.label || '',
            type: field.type || 'text',
            value: field.value ?? null,
            order: field.order ?? index,
          }));
          setYamlFields(importedFields);
        } else {
          alert('Invalid configuration file format');
        }
      } catch (error) {
        alert('Error parsing configuration file: ' + (error as Error).message);
      }
    };
    reader.readAsText(file);
    // Reset the input so the same file can be imported again
    event.target.value = '';
  }

  // MARK: DND Kit Setup

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    if (active.id !== over.id) {
      setYamlFields((yamlFields) => {
        yamlFields = yamlFields.sort((a, b) => a.order - b.order);
        const oldIndex = yamlFields.findIndex(
          (field) => field.id === active.id
        );
        const newIndex = yamlFields.findIndex((field) => field.id === over.id);
        const newFields = arrayMove(yamlFields, oldIndex, newIndex).map(
          (field, index) => ({
            ...field,
            order: index,
          })
        );
        return newFields;
      });
    }
  }

  function copyToClipboard() {
    const yamlLines = yamlFields
      .sort((a, b) => a.order - b.order)
      .map((field) => {
        let valueString;
        if (field.type === 'list' && Array.isArray(field.value)) {
          valueString =
            '\n' +
            field.value
              .map((item: string | number | boolean | null) => `  - ${item}`)
              .join('\n');
        } else if (field.type === 'boolean') {
          valueString = field.value ? 'true' : 'false';
        } else {
          valueString = field.value;
        }
        return `${field.label}: ${valueString}`;
      })
      .join('\n');
    const fullContent = `---\n${yamlLines}\n---\n\n${markdownContent}`;
    navigator.clipboard.writeText(fullContent);
  }

  // MARK: Main Component Render

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <div
          className="flex flex-col items-center gap-4"
          role="status"
          aria-live="polite"
        >
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"
            aria-label="Loading"
          ></div>
          <div className="text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <header className="fixed top-0 left-0 w-full bg-white dark:bg-black border-b border-gray-300 dark:border-gray-700 p-4 flex z-10 justify-end">
        <div className="flex gap-x-2">
          <button
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 cursor-pointer flex items-center gap-x-2"
            onClick={exportProperties}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Export Properties
          </button>
          <label className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 cursor-pointer flex items-center gap-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            <div>
              Import Properties
              <input
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={importProperties}
              />
            </div>
          </label>
        </div>
      </header>
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center py-8 px-4 sm:py-32 sm:px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex w-full flex-col sm:flex-row sm:justify-between gap-4">
          <div className="mb-4 block text-2xl font-bold dark:text-white">
            Markdown Post Writer
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 cursor-pointer flex items-center gap-x-2"
              onClick={copyToClipboard}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z"
                />
              </svg>
              Copy Markdown
            </button>
          </div>
        </div>
        <div className="mb-8 text-gray-600 dark:text-gray-300">
          All changes are saved automatically in your browser&apos;s local
          storage.
        </div>
        <div className="mb-4 flex items-center">
          <button
            className="cursor-pointer"
            onClick={() => setYamlIsHidden(!yamlIsHidden)}
          >
            {yamlIsHidden ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m19.5 8.25-7.5 7.5-7.5-7.5"
                />
              </svg>
            )}
          </button>
          <div className="text-lg font-semibold dark:text-white">
            Properties ({yamlFields.length})
          </div>
        </div>
        <div className={`mb-8 w-full ${yamlIsHidden ? 'hidden' : 'block'}`}>
          <div className="mb-8 w-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={yamlFields}
                strategy={verticalListSortingStrategy}
              >
                {yamlFields
                  .sort((field) => field.order)
                  .map((field, index) => (
                    <SortableYamlField
                      key={field.id}
                      id={field.id}
                      field={field}
                      index={index}
                      yamlFields={yamlFields}
                      setYamlFields={setYamlFields}
                      handle={true}
                    />
                  ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="justify-items-center">
            <button
              className="mb-8 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 cursor-pointer flex items-center gap-x-2"
              onClick={addYamlField}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              Add YAML Field
            </button>
          </div>
        </div>
        <div className="container">
          <MDEditor
            value={markdownContent}
            onChange={(val) => setMarkdownContent(val || '')}
          />
        </div>
      </main>
    </div>
  );
}

// MARK: Sortable Yaml Field Component

interface SortableYamlFieldProps {
  id: number;
  field: YamlField;
  index: number;
  yamlFields: YamlField[];
  setYamlFields: React.Dispatch<React.SetStateAction<YamlField[]>>;
  handle: boolean;
}

function SortableYamlField(props: SortableYamlFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { field, index, yamlFields, setYamlFields } = props;

  function determineInputType(type: YamlField['type']) {
    switch (type) {
      case 'number':
        return 'number';
      case 'boolean':
        return 'checkbox';
      case 'date':
        return 'date';
      case 'datetime':
        return 'datetime-local';
      default:
        return 'text';
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'ring-2 ring-blue-500 rounded-md bg-blue-50 dark:bg-blue-900/20' : ''}`}
    >
      <div>
        <div
          key={index}
          className="mb-2 sm:mb-4 w-full flex flex-wrap sm:flex-nowrap gap-2 sm:gap-x-4 items-center"
        >
          <input
            type="text"
            className="w-full sm:w-auto sm:flex-1 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={field.label || ''}
            onChange={(e) => {
              const newFields = [...yamlFields];
              newFields[index].label = e.target.value;
              setYamlFields(newFields);
            }}
          />
          {(field.type === 'date' ||
            field.type === 'datetime' ||
            field.type === 'text' ||
            field.type === 'number') && (
            <input
              type={determineInputType(field.type)}
              className="w-full sm:w-auto sm:flex-1 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={(field.value as string | number | null) || ''}
              onChange={(e) => {
                if (field.type === 'boolean') {
                  const newFields = [...yamlFields];
                  newFields[index].value = e.target.checked;
                  setYamlFields(newFields);
                  return;
                }

                const newFields = [...yamlFields];
                newFields[index].value = e.target.value;
                setYamlFields(newFields);
              }}
            />
          )}
          {field.type === 'boolean' && (
            <select
              className="w-full sm:w-auto sm:flex-1 p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={field.value ? 'true' : 'false'}
              onChange={(e) => {
                const newFields = [...yamlFields];
                newFields[index].value = e.target.value === 'true';
                setYamlFields(newFields);
              }}
            >
              <option value="true">True</option>
              <option value="false">False</option>
            </select>
          )}
          <select
            className="flex-1 sm:flex-none p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={field.type}
            onChange={(e) => {
              const newFields = [...yamlFields];
              newFields[index].type = e.target.value as YamlField['type'];
              setYamlFields(newFields);
            }}
          >
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
            <option value="date">Date</option>
            <option value="datetime">Datetime</option>
            <option value="list">List</option>
          </select>
          <button
            className="rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600 cursor-pointer"
            onClick={() => {
              const newFields = yamlFields.filter((_, i) => i !== index);
              setYamlFields(newFields);
            }}
          >
            Remove
          </button>
          {/* Desktop drag handle - shown at the end of the row on larger screens */}
          <div
            className="hidden sm:block cursor-move p-2 bg-gray-300 rounded dark:bg-gray-600"
            {...listeners}
            {...attributes}
          >
            &#x2630;
          </div>
        </div>
        {/* Mobile drag handle - shown centered below the row on small screens */}
        <div className="sm:hidden flex justify-center mb-4">
          <div
            className={`cursor-move p-2 px-8 bg-gray-300 rounded dark:bg-gray-600 touch-none ${isDragging ? 'bg-blue-400 dark:bg-blue-600' : ''}`}
            {...listeners}
            {...attributes}
          >
            &#x2630;
          </div>
        </div>
        {field.type === 'list' && (
          <div className="my-4 border border-gray-300 rounded-md p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-600">
            {field.value && Array.isArray(field.value)
              ? field.value.map((item: string, itemIndex: number) => (
                  <div
                    key={itemIndex}
                    className="mb-2 flex gap-x-4 items-center"
                  >
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      value={item}
                      onChange={(e) => {
                        const newFields = [...yamlFields];
                        const newList = Array.isArray(newFields[index].value)
                          ? [...newFields[index].value]
                          : [];
                        newList[itemIndex] = e.target.value;
                        newFields[index].value = newList;
                        setYamlFields(newFields);
                      }}
                    />
                    <button
                      className="ml-2 rounded bg-red-500 px-2 py-1 text-white hover:bg-red-600 cursor-pointer"
                      onClick={() => {
                        const newFields = [...yamlFields];
                        const newList = [
                          ...(Array.isArray(newFields[index].value)
                            ? newFields[index].value
                            : []),
                        ].filter((_, i: number) => i !== itemIndex);
                        newFields[index].value = newList;
                        setYamlFields(newFields);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              : null}
            <div className="text-center">
              <button
                className="mt-2 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 cursor-pointer"
                onClick={() => {
                  const newFields = [...yamlFields];
                  const newList = [
                    ...(Array.isArray(newFields[index].value)
                      ? (newFields[index].value as string[])
                      : []),
                    '',
                  ];
                  newFields[index].value = newList;
                  setYamlFields(newFields);
                }}
              >
                Add List Item
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
