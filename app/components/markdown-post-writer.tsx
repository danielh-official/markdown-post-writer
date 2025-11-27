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

  // MARK: Main Component Render

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center py-8 px-4 sm:py-32 sm:px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex w-full flex-col sm:flex-row sm:justify-between gap-4">
          <div className="mb-4 block text-2xl font-bold dark:text-white">
            Markdown Post Writer
          </div>
          <div className="flex">
            {isClient && (
              <button
                className="mr-4 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 cursor-pointer"
                onClick={() => {
                  const yamlLines = yamlFields
                    .sort((a, b) => a.order - b.order)
                    .map((field) => {
                      let valueString;
                      if (field.type === 'list' && Array.isArray(field.value)) {
                        valueString =
                          '\n' +
                          field.value
                            .map(
                              (item: string | number | boolean | null) =>
                                `  - ${item}`
                            )
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
                }}
              >
                Copy Markdown
              </button>
            )}
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
            Properties ({yamlIsHidden ? 'Hidden' : 'Shown'})
          </div>
        </div>
        {yamlFields.length === 0 && !yamlIsHidden && (
          <div className="mb-8 w-full rounded border border-gray-300 bg-gray-50 p-4 text-center dark:bg-gray-800 dark:border-gray-600">
            No YAML fields added. Click &quot;Add YAML Field&quot; to get
            started.
          </div>
        )}
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
                {/* <DragOverlay></DragOverlay> */}
              </SortableContext>
            </DndContext>
          </div>
          <div className="text-end">
            {isClient && (
              <button
                className="mb-8 rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 cursor-pointer"
                onClick={addYamlField}
              >
                Add YAML Field
              </button>
            )}
          </div>
        </div>
        <div className="container">
          {isClient && (
            <MDEditor
              value={markdownContent}
              onChange={(val) => setMarkdownContent(val || '')}
            />
          )}
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
        <div key={index} className="mb-2 sm:mb-4 w-full flex flex-wrap sm:flex-nowrap gap-2 sm:gap-x-4 items-center">
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
