import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { X, Play, AlertCircle, Loader2, Terminal, ChevronDown } from 'lucide-react';
import './CompilerModal.css';

const LANGUAGES = [
    { id: 'python', name: 'Python', version: '3.10.0', monacoId: 'python', template: 'print("Hello, World!")' },
    { id: 'javascript', name: 'JavaScript', version: '18.15.0', monacoId: 'javascript', template: 'console.log("Hello, World!");' },
    { id: 'typescript', name: 'TypeScript', version: '5.0.3', monacoId: 'typescript', template: 'console.log("Hello, World!");' },
    { id: 'java', name: 'Java', version: '15.0.2', monacoId: 'java', template: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}' },
    { id: 'c', name: 'C', version: '10.2.0', monacoId: 'c', template: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}' },
    { id: 'cpp', name: 'C++', version: '10.2.0', monacoId: 'cpp', template: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}' },
    { id: 'go', name: 'Go', version: '1.16.2', monacoId: 'go', template: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}' },
    { id: 'rust', name: 'Rust', version: '1.68.2', monacoId: 'rust', template: 'fn main() {\n    println!("Hello, World!");\n}' },
    { id: 'ruby', name: 'Ruby', version: '3.0.1', monacoId: 'ruby', template: 'puts "Hello, World!"' },
];

const CompilerModal = ({ isOpen, onClose }) => {
    const [language, setLanguage] = useState(LANGUAGES[0]);
    const [code, setCode] = useState(LANGUAGES[0].template);
    const [output, setOutput] = useState('');
    const [error, setError] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [showLangDropdown, setShowLangDropdown] = useState(false);

    // Close on Escape key
    React.useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (showLangDropdown && !e.target.closest('.lang-dropdown-container')) {
                setShowLangDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showLangDropdown]);

    if (!isOpen) return null;

    const handleLanguageChange = (lang) => {
        setLanguage(lang);
        setCode(lang.template);
        setOutput('');
        setError('');
        setShowLangDropdown(false);
    };

    const handleRunCode = async () => {
        setIsRunning(true);
        setOutput('');
        setError('');

        try {
            // Use Piston API for code execution
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    language: language.id,
                    version: language.version,
                    files: [
                        {
                            name: language.id === 'java' ? 'Main.java' : `main.${language.id}`,
                            content: code
                        }
                    ]
                }),
            });

            const data = await response.json();

            if (data.run) {
                if (data.run.stderr) {
                    setError(data.run.stderr);
                }
                if (data.run.stdout) {
                    setOutput(data.run.stdout);
                }
                if (data.run.code !== 0 && !data.run.stderr && !data.run.stdout) {
                    setError(`Process exited with code ${data.run.code}`);
                }
            } else if (data.message) {
                setError(data.message);
            }
        } catch (err) {
            setError('Failed to connect to the compiler server. Please check your internet connection.');
            console.error(err);
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="compiler-overlay">
            <div className="compiler-modal glass-panel animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="compiler-header">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-green-400" />
                        <h2 className="text-lg font-bold text-white">Code Playground</h2>

                        {/* Language Selector */}
                        <div className="lang-dropdown-container relative ml-2">
                            <button
                                onClick={() => setShowLangDropdown(!showLangDropdown)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600 rounded-lg text-sm font-medium text-white transition-all border border-slate-600"
                            >
                                <span className="text-green-400">{language.name}</span>
                                <ChevronDown size={14} className={`transition-transform ${showLangDropdown ? 'rotate-180' : ''}`} />
                            </button>

                            {showLangDropdown && (
                                <div className="absolute top-full left-0 mt-1 w-48 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {LANGUAGES.map((lang) => (
                                        <button
                                            key={lang.id}
                                            onClick={() => handleLanguageChange(lang)}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center justify-between ${language.id === lang.id ? 'bg-slate-700/50 text-green-400' : 'text-slate-300'
                                                }`}
                                        >
                                            {lang.name}
                                            <span className="text-xs text-slate-500">{lang.version}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="close-btn" title="Close Compiler (Esc)">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="compiler-body">
                    {/* Editor Section */}
                    <div className="editor-section">
                        <Editor
                            height="100%"
                            language={language.monacoId}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                                padding: { top: 10 }
                            }}
                        />
                    </div>

                    {/* Output Section */}
                    <div className="output-section">
                        <div className="output-header">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Output Terminal</span>
                            <button
                                onClick={handleRunCode}
                                disabled={isRunning}
                                className={`run-btn ${isRunning ? 'opacity-75 cursor-not-allowed' : ''}`}
                            >
                                {isRunning ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Running...
                                    </>
                                ) : (
                                    <>
                                        <Play size={16} fill="currentColor" />
                                        Run Code
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="output-console font-mono text-sm">
                            {error ? (
                                <div className="text-red-400 whitespace-pre-wrap flex gap-2 items-start p-2">
                                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            ) : output ? (
                                <div className="text-green-300 whitespace-pre-wrap p-2">{output}</div>
                            ) : (
                                <div className="text-gray-500 italic p-2 select-none">
                                    Click "Run Code" to execute your {language.name} code...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompilerModal;
