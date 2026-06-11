/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Book } from './types';

export const SAMPLE_BOOKS: Book[] = [
  {
    id: 'de-1',
    title: 'Designing Data-Intensive Applications',
    authors: ['Martin Kleppmann'],
    publisher: "O'Reilly Media",
    year: 2017,
    category: 'Data Engineering',
    coverImage: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)', // Blue Sapphire Slate
    fileUrl: 'https://arxiv.org/pdf/2203.01044.pdf', // Using a public research PDF as a safe sample embed
    fileType: 'pdf',
    description: 'The definitive guide to understanding the storage, processing, and structures of data-intensive systems. Learn the trade-offs of different databases, replication protocols, partitioning, and batch/streaming processors.',
    summary: {
      overview: 'This classic covers the fundamental architectures behind relational databases, NoSQL, message brokers, and streaming platforms. It bridges the gap between theory and practical engineering, showing how data storage formats, distribution models, and concurrency controls impact performance under scale.',
      targetAudience: 'Software Engineers, Data Engineers, and System Architects who want to build highly reliable, scalable, and maintainable data systems.',
      entryPrerequisites: 'Substantial experience in general programming, familiarity with basic server-client architectures, and database query basics.',
      learningPath: [
        'Understand data representations (JSON, XML, Protocol Buffers, Avro)',
        'Dive into Storage Engines (SSTables, LSM-Trees vs B-Trees)',
        'Master Replication (Single-leader, Multi-leader, Leaderless)',
        'Implement Partitioning (Sharding by Key, Hash, or Range)',
        'Analyze transactions, serializability, and distributed consensus protocols.'
      ]
    },
    keyTopics: ['Data Models & Query Languages', 'Storage and Retrieval', 'Replication and Partitioning', 'Transactions', 'Distributed Systems Consensus', 'Batch & Stream Processing'],
    pageCount: 612,
    isFavorite: true,
    progress: 75
  },
  {
    id: 'ai-1',
    title: 'Generative AI with Large Language Models',
    authors: ['Nathan Patel', 'Elena Rostova'],
    publisher: 'DeepTech Publications',
    year: 2024,
    category: 'AI Engineering',
    coverImage: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #4c1d95 0%, #1e1b4b 100%)', // Royal Purple Velvet
    fileUrl: 'https://arxiv.org/pdf/2303.18223.pdf', // LLM survey paper as pdf
    fileType: 'pdf',
    description: 'A comprehensive engineering handbook on training, fine-tuning, and deploying generative models. Covers RLHF, Quantization (QLoRA), Retrieval-Augmented Generation (RAG), and agentic architectures.',
    summary: {
      overview: 'Perfect for hands-on developers transitioning to AI application architecture. It details neural net parameters, transformer attention mechanisms, prompt engineering frameworks (LangChain, LlamaIndex), and serving optimization.',
      targetAudience: 'AI Engineers, Machine Learning Developers, and technical leaders looking to integrate custom LLMs into software products.',
      entryPrerequisites: 'Intermediate Python (PyTorch experience is a plus) and linear algebra foundations.',
      learningPath: [
        'Explore Transformer mechanism (Self-Attention, Encoder-Decoder)',
        'Deploy pre-trained models using Hugging Face Transformers',
        'Learn Parameter-Efficient Fine-Tuning (PEFT, LoRA)',
        'Architect advanced RAG pipelines with Vector Databases',
        'Deploy models optimally using vLLM and TensorRT-LLM.'
      ]
    },
    keyTopics: ['Transformers', 'Vector Databases & RAG', 'PEFT & QLoRA', 'RLHF & Alignment', 'Agentic Workflows', 'LLM Security & Prompt Injection'],
    pageCount: 384,
    isFavorite: true,
    progress: 40
  },
  {
    id: 'ml-1',
    title: 'Deep Learning',
    authors: ['Ian Goodfellow', 'Yoshua Bengio', 'Aaron Courville'],
    publisher: 'MIT Press',
    year: 2016,
    category: 'Machine Learning and Deep Learning',
    coverImage: 'https://images.unsplash.com/photo-1527474305487-b87b222841cc?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #111827 0%, #374151 100%)', // Matte Charcoal Obsidian
    fileUrl: 'https://arxiv.org/pdf/1801.06146.pdf', // Classic ML research paper
    fileType: 'pdf',
    description: 'The definitive textbook on machine learning and deep learning, covering mathematical and conceptual backgrounds, deep networks, and research frontiers.',
    summary: {
      overview: 'Regarded as the holy bible of deep learning, this MIT text covers essential mathematical tools (linear algebra, probability, information theory, numerical computation), standard neural architectures, and cutting-edge deep generative concepts.',
      targetAudience: 'Undergraduate or graduate students of computer science and industry practitioners seeking deep mathematical foundation in neural networks.',
      entryPrerequisites: 'Solid calculus, linear algebra, probability theory, and programming familiarity.',
      learningPath: [
        'Linear Algebra & Probability foundations',
        'Deep Feedforward Networks & Backpropagation',
        'Convolutional Networks (CNNs) for Computer Vision',
        'Recurrent & Recursive Neural Nets (RNNs)',
        'Optimization & Regularization methodologies.'
      ]
    },
    keyTopics: ['Linear Algebra & Probability', 'Feedforward Deep Nets', 'Regularization & Optimization', 'CNNs & RNNs', 'Autoencoders', 'Generative Adversarial Networks (GANs)'],
    pageCount: 800,
    isFavorite: false,
    progress: 15
  },
  {
    id: 'math-1',
    title: 'Mathematics for Machine Learning',
    authors: ['Marc Peter Deisenroth', 'A. Aldo Faisal', 'Cheng Soon Ong'],
    publisher: 'Cambridge University Press',
    year: 2020,
    category: 'Math for Data Science',
    coverImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)', // Emerald Spruce Forest
    fileUrl: 'https://arxiv.org/pdf/1908.03214.pdf', // Math-oriented Arxiv paper
    fileType: 'pdf',
    description: 'A self-contained tutorial on the mathematical fundamentals that support machine learning, translating abstract concepts into algorithms.',
    summary: {
      overview: 'This text maps four basic mathematical pillars—linear algebra, analytic geometry, matrix decompositions, and vector calculus—to central machine learning paradigms containing regression, PCA, SVMs, and Gaussian mixtures.',
      targetAudience: 'Intermediate data scientists who feel comfortable writing code but want to gain an intuitive, mathematically robust grasp of their algorithms.',
      entryPrerequisites: 'Basic high school mathematics and fundamental programming background.',
      learningPath: [
        'Master Matrices, Vector Spaces, and Linear Equations',
        'Analyze Matrix Decompositions (Eigenvalues, SVD)',
        'Understand Vector Calculus and Gradients',
        'Apply mathematical constructs to Linear Regression and Principal Component Analysis (PCA).'
      ]
    },
    keyTopics: ['Linear Algebra', 'Matrix Decomposition', 'Vector Calculus', 'Probability & Distributions', 'Linear Regression', 'Dimensionality Reduction (SVD/PCA)'],
    pageCount: 398,
    isFavorite: true,
    progress: 90
  },
  {
    id: 'stat-1',
    title: 'An Introduction to Statistical Learning',
    authors: ['Gareth James', 'Daniela Witten', 'Trevor Hastie', 'Robert Tibshirani'],
    publisher: 'Springer',
    year: 2021,
    category: 'Math for Data Science',
    coverImage: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', // Deep Ocean Blue
    fileUrl: 'https://arxiv.org/pdf/1407.7858.pdf', // Classic stats paper
    fileType: 'pdf',
    description: 'An invaluable guide to statistical modeling and machine learning methods, complete with hands-on R and Python programming examples.',
    summary: {
      overview: 'Focusing on the application of statistical methods, this text presents intuitive explanations of high-dimensional prediction, regularized regression, classification trees, support vector machines, and unsupervised clustering.',
      targetAudience: 'Data analysts, business analysts, and researchers looking to make statistically sound data predictions.',
      entryPrerequisites: 'Prerequisites include single variable calculus, basic linear algebra, and intro-level programming.',
      learningPath: [
        'Explore bias-variance trade-offs & training errors',
        'Implement Linear & Logistic Regression',
        'Learn Resampling (Cross-Validation, Bootstrapping)',
        'Execute Regularization (Ridge & Lasso Regression)',
        'Build Tree-based assemblies (Random Forests, Boosting).'
      ]
    },
    keyTopics: ['Statistical Modeling', 'Resampling Methods', 'Regularization (Lasso/Ridge)', 'Tree-Based Methods', 'Support Vector Machines', 'Clustering & PCA'],
    pageCount: 440,
    isFavorite: true,
    progress: 55
  },
  {
    id: 'sql-1',
    title: 'SQL for Data Analysis',
    authors: ['Cathy Tanimura'],
    publisher: "O'Reilly Media",
    year: 2021,
    category: 'SQL',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #7c2d12 0%, #431407 100%)', // Rustic Copper Terracotta
    fileUrl: 'https://arxiv.org/pdf/2112.00001.pdf', // Tech overview sheet
    fileType: 'pdf',
    description: 'A deep-dive tutorial on utilizing SQL for data structuring, filtering, windowing, time-series analysis, and cohort optimization directly in the database.',
    summary: {
      overview: 'Go beyond basic SELECT statements. This book teaches SQL techniques for solving real-world analysis problems—including calculating retention rates, building rolling averages, and preparing raw datasets for statistical tools.',
      targetAudience: 'Analysts, data engineers, and data scientists looking to leverage the full mathematical power of SQL databases natively.',
      entryPrerequisites: 'Basic knowledge of tables, primary keys, and introductory join statements.',
      learningPath: [
        'Aggregate & Join data across multiple systems',
        'Implement Window Functions (LAG, LEAD, RANK, PARTITION BY)',
        'Construct robust Cohort Analysis & Funnels',
        'Learn SQL Optimization and query tuning methodologies.'
      ]
    },
    keyTopics: ['Data Profiling', 'Window Functions', 'Time Series & Trends', 'Cohorts & Retention', 'Text Analysis in SQL', 'Database Optimization'],
    pageCount: 360,
    isFavorite: false,
    progress: 30
  },
  {
    id: 'py-1',
    title: 'Fluent Python: Clear, Concise, and Effective',
    authors: ['Luciano Ramalho'],
    publisher: "O'Reilly Media",
    year: 2022,
    category: 'Programming Languages',
    coverImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #0f766e 0%, #115e59 100%)', // Seaweed Teal
    fileUrl: 'https://arxiv.org/pdf/2005.10001.pdf', // Python internals / scientific PDF
    fileType: 'epub', // Shown as EPUB, provides Open EPUB dialog
    description: 'A masterpiece that reveals how to write idiomatic Python code by utilizing the best, most elegant features of the language.',
    summary: {
      overview: 'Fluent Python guides you through the language features to help you write elegant, fast, and concise code. Uncover the magic methods container protocol, asynchronous generators, coroutines, and type-hinted data structures.',
      targetAudience: 'Developers who already know Python basics and want to advance to master Pythons advanced features with idiomatic precision.',
      entryPrerequisites: 'Familiarity with syntax, variable assignments, loops, and basic OOP principles.',
      learningPath: [
        'Examine the Python Data Model (Magic Methods)',
        'Understand Sequences: Lists, Dicts, Sets and Slicing techniques',
        'Master Functions as First-class Objects',
        'Implement Generators, Iterators, and Asyncio workflows.'
      ]
    },
    keyTopics: ['The Python Data Model', 'Data Structures (Lists/Dicts/Sets)', 'Functions as First-Class Citizens', 'OOP & Design Patterns', 'Metaprogramming & Decorators', 'Concurrency & Generator Coroutines'],
    pageCount: 742,
    isFavorite: true,
    progress: 88
  },
  {
    id: 'viz-1',
    title: 'Interactive Data Science Visuals',
    authors: ['Laura Garcia', 'Marcus Vance'],
    publisher: 'VisArtistry Media',
    year: 2023,
    category: 'Data Visualization',
    coverImage: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%)', // Deep Crimson Rosewood
    fileUrl: 'https://arxiv.org/pdf/1311.0002.pdf', // Visualization paper
    fileType: 'pdf',
    description: 'Learn the core principles of graphical representation and build interactive browser charts using SVG, Canvas, D3, and WebGL.',
    summary: {
      overview: 'This modern guide links design principles (Gestalt theory, contrast ratios, cognitive color mapping) to practical data tools. From building line charts to massive WebGL multi-million node network representations, discover how to clarify your charts.',
      targetAudience: 'Data scientists and web developers who want to convey quantitative information through custom web designs.',
      entryPrerequisites: 'Comfortable with JavaScript ES6, HTML, and basic CSS styles.',
      learningPath: [
        'Study Cognitive Psychology for Graphic Representation',
        'Work with Canvas, SVG grid coordinates, and viewBox mechanics',
        'Architect responsive chart layouts that fit dynamically into dashboards',
        'Create interactive brushes, tooltips, and custom animations.'
      ]
    },
    keyTopics: ['Visual Cognitive Psychology', 'SVG vs Canvas vs WebGL', 'Responsive Layout Designs', 'Interactive Callouts & Tooltips', 'D3.js Data Join Engine', 'Dynamic Real-time Dashboards'],
    pageCount: 310,
    isFavorite: false,
    progress: 10
  },
  {
    id: 'ops-1',
    title: 'Fundamentals of MLOps: Pipelines & Deployments',
    authors: ['Noah Gift', 'Danielle Chen'],
    publisher: 'InfraTech Academic',
    year: 2023,
    category: 'Machine Learning and Deep Learning',
    coverImage: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #111827 0%, #1e293b 100%)', // Jet Steel Steel
    fileUrl: 'https://arxiv.org/pdf/2205.00003.pdf', // MLOps engineering report
    fileType: 'pdf',
    description: 'A rigorous blueprint for modern machine learning engineering, focusing on CI/CD automation, feature stores, and model deployment registries.',
    summary: {
      overview: 'This specialized engineering text introduces the lifecycle automation stack. Learn to orchestrate ML workflows using tools like Kubeflow, MLflow, and Prefect, handle data drift, manage feature pipelines, and maintain highly secure low-latency APIs.',
      targetAudience: 'Machine Learning Engineers, Data Architects, Infrastructure Developers, and Cloud DevOps Pioneers.',
      entryPrerequisites: 'Working python knowledge, general Docker container knowledge, and ML model training concepts.',
      learningPath: [
        'Establish CI/CD for model code & reproducibility parameters',
        'Implement MLflow for parameter and metric logging',
        'Deploy resilient API microservices hosting PyTorch models',
        'Create continuous monitoring systems looking for model drift types.'
      ]
    },
    keyTopics: ['ML Pipeline Automation', 'CI/CD for Machine Learning', 'Model Registry & Versioning', 'Continuous Training (CT) triggers', 'Data & Concept Drift Auditing', 'Container Deployments (K8s)'],
    pageCount: 450,
    isFavorite: true,
    progress: 22
  },
  {
    id: 'biz-1',
    title: 'Business Analytics: Prescriptive Insights',
    authors: ['Sarah Jenkins'],
    publisher: 'Lexington Business Press',
    year: 2022,
    category: 'Business Analytics',
    coverImage: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #312e81 0%, #1d1d42 100%)', // Midnight Royal Indigo
    fileUrl: 'https://arxiv.org/pdf/1904.00004.pdf', // Analytics application paper
    fileType: 'pdf',
    description: 'Unlock business value. Turn quantitative data sciences into strategic action items, predictive trends, and simulation-optimized layouts.',
    summary: {
      overview: 'An executive handbook focusing on statistical modeling for strategic decision-making. Topics cover regression analytics, time-series forecasting, integer programming optimizations, and pricing models.',
      targetAudience: 'Data Analysts, Management Consultants, and Tech Leads translating statistical findings to boardrooms.',
      entryPrerequisites: 'Introductory probability, statistics, and business economics concepts.',
      learningPath: [
        'Formulate business problems in quantitative frameworks',
        'Build forecasting trends with Seasonal ARIMA methodologies',
        'Perform integer programming & linear optimization simulations',
        'Communicate executive findings using beautiful data slides.'
      ]
    },
    keyTopics: ['Executive Decision Frameworks', 'Predictive Modeling (ARIMA)', 'Optimization & Simulation (Simplex)', 'Pricing Models & Elasticity', 'A/B Testing & Causal Inference', 'Insight Communication Methods'],
    pageCount: 290,
    isFavorite: false,
    progress: 60
  },
  {
    id: 'ml-2',
    title: 'Hands-On Machine Learning with Scikit-Learn & PyTorch',
    authors: ['Aurélien Géron'],
    publisher: "O'Reilly Media",
    year: 2023,
    category: 'Machine Learning and Deep Learning',
    coverImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)', // Indigo Horizon
    fileUrl: 'https://arxiv.org/pdf/2002.00005.pdf', // ML survey
    fileType: 'pdf',
    description: 'Through concrete examples, minimal theory, and production-ready Python frameworks, learn the concepts and tools for building intelligent systems.',
    summary: {
      overview: 'An incredibly popular, practical guide covering the spectrum from traditional regression algorithms up through massive multi-gpu transformers. Highly hands-on with clear source code Jupyter Notebook highlights.',
      targetAudience: 'Developers looking to quickly implement practical models using standard python packages.',
      entryPrerequisites: 'Substantial Python programming and intro-level matrix operations.',
      learningPath: [
        'Explore the complete end-to-end Machine Learning project pipeline',
        'Train Support Vector Machines and Decision Trees',
        'Utilize Ensemble Learning and Random Forests',
        'Build Artificial Neural Networks inside PyTorch & Keras.'
      ]
    },
    keyTopics: ['The End-to-End ML Pipeline', 'Supervised Learning Algorithms', 'Unsupervised Clustering & PCA', 'Neural Networks and Deep Architecture', 'PyTorch Tensors and Computations', 'Scaling & Production ML Deployments'],
    pageCount: 850,
    isFavorite: true,
    progress: 50
  },
  {
    id: 'de-2',
    title: 'High-Performance Data Pipelines',
    authors: ['Alex Pettit'],
    publisher: 'DeepData Publishing',
    year: 2024,
    category: 'Data Engineering',
    coverImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #0f172a 0%, #3b82f6 100%)', // Neon Cyber Blue
    fileUrl: 'https://arxiv.org/pdf/1703.00006.pdf', // Big Data framework paper
    fileType: 'pdf',
    description: 'Learn modern orchestration patterns for streaming and batch processing using Spark, Kafka, Flink, and dbt with extreme latency control.',
    summary: {
      overview: 'Focuses entirely on parallel data delivery systems. Learn to manage stateful stream computations, optimize spark shuffle partitions, partition storage formats like Parquet, and structure dbt models.',
      targetAudience: 'In-the-trenches Data Engineers, Backend Engineers, and Infrastructure Devs.',
      entryPrerequisites: 'Programming in Python, Java, or Scala, and high-level database structures.',
      learningPath: [
        'Analyze streaming vs batch computations',
        'Configure Kafka multi-partition clusters & consumers',
        'Optimize cluster distribution inside Apache Spark',
        'Manage incremental table changes inside the warehouse using dbt.'
      ]
    },
    keyTopics: ['Spark Shuffle Processing', 'Kafka Clustering & Partitions', 'Stateful Stream Processing', 'Columnar Formats vs Rows', 'Orchestration Platforms (Dagster/Airflow)', 'dbt Modeling Patterns'],
    pageCount: 410,
    isFavorite: false,
    progress: 18
  },
  {
    id: 'stat-2',
    title: 'Practical Statistics for Data Scientists',
    authors: ['Peter Bruce', 'Andrew Bruce', 'Ines Gedeon'],
    publisher: "O'Reilly Media",
    year: 2020,
    category: 'Math for Data Science',
    coverImage: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)', // Amber Amberwood
    fileUrl: 'https://arxiv.org/pdf/1612.00007.pdf', // Stats paper
    fileType: 'epub',
    description: 'A brilliant guide uncovering why statistical methods are relevant to data science, how to avoid misinterpreting key signals, and and how to implement clean code examples.',
    summary: {
      overview: 'Too many data science courses dive into ML without solid statistical bedrock. This book teaches standard sampling, distribution rules, hypothesis testing, A/B experiments, statistical bootstrap validation, and classification algorithms.',
      targetAudience: 'Practitioners who want to construct high-integrity experiments, explain confidence bounds, and design robust A/B testing protocols.',
      entryPrerequisites: 'Basic knowledge of Python or R syntax and algebra equations.',
      learningPath: [
        'Recognize core distribution patterns (Normal, Poisson, Binomial)',
        'Formulate accurate null and alternative hypotheses',
        'Determine power calculations and target sample sizing for A/B tests',
        'Diagnose multicollinearity and homoscedasticity in linear regressions.'
      ]
    },
    keyTopics: ['Exploratory Data Analysis', 'Data and Sampling Distributions', 'Statistical Experiments & A/B testing', 'Regression & Prediction diagnostics', 'Classification diagnostics', 'Unsupervised Machine Learning principles'],
    pageCount: 360,
    isFavorite: false,
    progress: 95
  },
  {
    id: 'ai-2',
    title: 'AI Agent Architecture & Multi-Agent Systems',
    authors: ['Kenji Tanaka', 'Celine Moreau'],
    publisher: 'Cognitive Science Press',
    year: 2024,
    category: 'AI Engineering',
    coverImage: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&q=80&w=400',
    coverColor: 'linear-gradient(135deg, #1e1b4b 0%, #311042 100%)', // Deep Cosmic Amethyst
    fileUrl: 'https://arxiv.org/pdf/2401.03408.pdf', // Real recent paper on AI Agents
    fileType: 'pdf',
    description: 'Designing autonomous software systems capable of planning, tools call integration, memory preservation, and self-correction cycles.',
    summary: {
      overview: 'Focuses entirely on the next frontier: AI Agents. Learn about planning algorithms (ReAct, Plan-and-Solve), stateful routing trees, semantic vector memory storage, agent collaboration conventions, and safety rails.',
      targetAudience: 'Advanced AI practitioners and system architects intending to construct fully independent workflows and automated enterprise tools.',
      entryPrerequisites: 'Extensive Python experience and intermediate transformer architecture knowledge.',
      learningPath: [
        'Implement planning mechanisms like ReAct prompts recursively',
        'Integrate agentic toolcalling systems securely with external API mocks',
        'Configure Vector-based vector memories for semantic session recalling',
        'Learn to build orchestrator-worker cooperative multi-agent state machines.'
      ]
    },
    keyTopics: ['Reasoning & Planning (ReAct)', 'Dynamic Tool Integrations', 'Long-term Semantic Memories', 'Multi-Agent State Orchestration', 'Verification & Evaluator Rails', 'Secure Agent Sandbox execution'],
    pageCount: 330,
    isFavorite: true,
    progress: 5
  }
];
