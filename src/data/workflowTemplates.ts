/**
 * workflowTemplates.ts
 * PhD-Level Pre-built Workflow Templates
 * Professional templates for common project types
 */

import { WorkflowNode, WorkflowEdge, WorkflowTemplate, ProjectWorkflow } from '../types/workflow';

/**
 * Template 1: Whop Product Launch
 * Complete workflow for launching a digital product on Whop
 */
// Whop Product Launch
const whopProductLaunchNodes: WorkflowNode[] = [
    {
        id: 'whop_1',
        type: 'task',
        title: 'Product Idea',
        description: 'Define your product concept and unique value proposition',
        position: { x: 50, y: 300 },
        status: 'pending'
    },
    {
        id: 'whop_2',
        type: 'task',
        title: 'Create Product',
        description: 'Build your digital product (course, software, template, etc.)',
        position: { x: 350, y: 300 },
        status: 'pending'
    },
    {
        id: 'whop_3',
        type: 'platform',
        title: 'Upload to Whop',
        description: 'Set up your Whop store and upload product files',
        position: { x: 650, y: 150 },
        status: 'pending',
        data: { platform: 'whop' }
    },
    {
        id: 'whop_4',
        type: 'task',
        title: 'Pricing Strategy',
        description: 'Set pricing, tiers, and subscription options',
        position: { x: 650, y: 450 },
        status: 'pending'
    },
    {
        id: 'whop_5',
        type: 'task',
        title: 'Landing Page',
        description: 'Create compelling sales page with benefits and testimonials',
        position: { x: 950, y: 300 },
        status: 'pending'
    },
    {
        id: 'whop_6',
        type: 'promotion',
        title: 'Marketing Launch',
        description: 'Execute marketing campaign and drive traffic',
        position: { x: 1250, y: 300 },
        status: 'pending'
    },
    {
        id: 'whop_7',
        type: 'milestone',
        title: 'First Sales',
        description: 'Achieve your first paying customers',
        position: { x: 1550, y: 300 },
        status: 'pending'
    }
];

const whopProductLaunchEdges: WorkflowEdge[] = [
    { id: 'e_whop_1', source: 'whop_1', target: 'whop_2' },
    { id: 'e_whop_2', source: 'whop_2', target: 'whop_3' },
    { id: 'e_whop_3', source: 'whop_2', target: 'whop_4' },
    { id: 'e_whop_4', source: 'whop_3', target: 'whop_5' },
    { id: 'e_whop_5', source: 'whop_4', target: 'whop_5' },
    { id: 'e_whop_6', source: 'whop_5', target: 'whop_6' },
    { id: 'e_whop_7', source: 'whop_6', target: 'whop_7' }
];

// Social Media Campaign
const socialMediaCampaignNodes: WorkflowNode[] = [
    {
        id: 'social_1',
        type: 'task',
        title: 'Content Planning',
        description: 'Plan content theme, messaging, and call-to-action',
        position: { x: 50, y: 300 },
        status: 'pending'
    },
    {
        id: 'social_2',
        type: 'media',
        title: 'Video Creation',
        description: 'Record and edit video content',
        position: { x: 350, y: 300 },
        status: 'pending'
    },
    {
        id: 'social_3',
        type: 'platform',
        title: 'TikTok',
        description: 'Upload optimized content to TikTok',
        position: { x: 650, y: 100 },
        status: 'pending',
        data: { platform: 'tiktok' }
    },
    {
        id: 'social_4',
        type: 'platform',
        title: 'Facebook',
        description: 'Share content on Facebook page/group',
        position: { x: 650, y: 300 },
        status: 'pending',
        data: { platform: 'facebook' }
    },
    {
        id: 'social_5',
        type: 'platform',
        title: 'Instagram',
        description: 'Post to Instagram feed/reels/stories',
        position: { x: 650, y: 500 },
        status: 'pending',
        data: { platform: 'instagram' }
    },
    {
        id: 'social_6',
        type: 'promotion',
        title: 'Run Ads',
        description: 'Set up paid advertising campaigns',
        position: { x: 950, y: 300 },
        status: 'pending'
    },
    {
        id: 'social_7',
        type: 'task',
        title: 'Analytics',
        description: 'Monitor performance and optimize',
        position: { x: 1250, y: 300 },
        status: 'pending'
    }
];

const socialMediaCampaignEdges: WorkflowEdge[] = [
    { id: 'e_social_1', source: 'social_1', target: 'social_2' },
    { id: 'e_social_2', source: 'social_2', target: 'social_3' },
    { id: 'e_social_3', source: 'social_2', target: 'social_4' },
    { id: 'e_social_4', source: 'social_2', target: 'social_5' },
    { id: 'e_social_5', source: 'social_3', target: 'social_6' },
    { id: 'e_social_6', source: 'social_4', target: 'social_6' },
    { id: 'e_social_7', source: 'social_5', target: 'social_6' },
    { id: 'e_social_8', source: 'social_6', target: 'social_7' }
];

// Content Creator Pipeline
const contentCreatorNodes: WorkflowNode[] = [
    {
        id: 'content_1',
        type: 'task',
        title: 'Topic Research',
        description: 'Research trending topics and audience interests',
        position: { x: 50, y: 300 },
        status: 'pending'
    },
    {
        id: 'content_2',
        type: 'task',
        title: 'Keywords',
        description: 'SEO keyword research and optimization',
        position: { x: 200, y: 500 },
        status: 'pending'
    },
    {
        id: 'content_3',
        type: 'task',
        title: 'Script Writing',
        description: 'Write content script or outline',
        position: { x: 350, y: 300 },
        status: 'pending'
    },
    {
        id: 'content_4',
        type: 'media',
        title: 'Recording',
        description: 'Record video/audio content',
        position: { x: 650, y: 300 },
        status: 'pending'
    },
    {
        id: 'content_5',
        type: 'media',
        title: 'Editing',
        description: 'Edit and polish the content',
        position: { x: 950, y: 300 },
        status: 'pending'
    },
    {
        id: 'content_6',
        type: 'task',
        title: 'Thumbnail',
        description: 'Create eye-catching thumbnail',
        position: { x: 800, y: 500 },
        status: 'pending'
    },
    {
        id: 'content_7',
        type: 'task',
        title: 'Upload',
        description: 'Upload to platforms with optimized metadata',
        position: { x: 1250, y: 300 },
        status: 'pending'
    },
    {
        id: 'content_8',
        type: 'task',
        title: 'Schedule',
        description: 'Schedule optimal posting time',
        position: { x: 1100, y: 500 },
        status: 'pending'
    },
    {
        id: 'content_9',
        type: 'promotion',
        title: 'Promotion',
        description: 'Cross-promote and engage with audience',
        position: { x: 1550, y: 300 },
        status: 'pending'
    }
];

const contentCreatorEdges: WorkflowEdge[] = [
    { id: 'e_content_1', source: 'content_1', target: 'content_2' },
    { id: 'e_content_2', source: 'content_1', target: 'content_3' },
    { id: 'e_content_3', source: 'content_2', target: 'content_3' },
    { id: 'e_content_4', source: 'content_3', target: 'content_4' },
    { id: 'e_content_5', source: 'content_4', target: 'content_5' },
    { id: 'e_content_6', source: 'content_4', target: 'content_6' },
    { id: 'e_content_7', source: 'content_5', target: 'content_7' },
    { id: 'e_content_8', source: 'content_6', target: 'content_7' },
    { id: 'e_content_9', source: 'content_5', target: 'content_8' },
    { id: 'e_content_10', source: 'content_8', target: 'content_7' },
    { id: 'e_content_11', source: 'content_7', target: 'content_9' }
];

// Custom Template (Empty)
const customTemplateNodes: WorkflowNode[] = [
    {
        id: 'custom_1',
        type: 'milestone',
        title: 'Start',
        description: 'Project starting point',
        position: { x: 100, y: 300 },
        status: 'pending'
    },
    {
        id: 'custom_2',
        type: 'milestone',
        title: 'Finish',
        description: 'Project completion',
        position: { x: 800, y: 300 },
        status: 'pending'
    }
];

const customTemplateEdges: WorkflowEdge[] = [
    { id: 'e_custom_1', source: 'custom_1', target: 'custom_2' }
];

/**
 * All built-in templates
 */
export const BUILTIN_TEMPLATES: WorkflowTemplate[] = [
    {
        id: 'template_whop_launch',
        name: 'Whop Product Launch',
        description: 'Complete workflow for launching a digital product on Whop platform',
        category: 'product-launch',
        nodes: whopProductLaunchNodes,
        edges: whopProductLaunchEdges,
        icon: 'Package',
        isBuiltIn: true,
        createdAt: new Date('2024-01-01')
    },
    {
        id: 'template_social_media',
        name: 'Social Media Campaign',
        description: 'Multi-platform social media content and advertising campaign',
        category: 'social-media',
        nodes: socialMediaCampaignNodes,
        edges: socialMediaCampaignEdges,
        icon: 'Share2',
        isBuiltIn: true,
        createdAt: new Date('2024-01-01')
    },
    {
        id: 'template_content_creator',
        name: 'Content Creator Pipeline',
        description: 'Full content creation workflow from research to publication',
        category: 'content-creation',
        nodes: contentCreatorNodes,
        edges: contentCreatorEdges,
        icon: 'Film',
        isBuiltIn: true,
        createdAt: new Date('2024-01-01')
    },
    {
        id: 'template_custom',
        name: 'Custom Project',
        description: 'Blank template to create your own custom workflow',
        category: 'custom',
        nodes: customTemplateNodes,
        edges: customTemplateEdges,
        icon: 'PlusSquare',
        isBuiltIn: true,
        createdAt: new Date('2024-01-01')
    }
];

/**
 * Clone a template for a new project
 * Generates new IDs for all nodes and edges
 */
export function cloneTemplateForProject(template: WorkflowTemplate, projectName: string): ProjectWorkflow {
    const idMap = new Map<string, string>();

    // Clone nodes with new IDs
    const nodes = template.nodes.map(node => {
        const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(node.id, newId);
        return {
            ...node,
            id: newId,
            status: 'pending' as const
        };
    });

    // Clone edges with updated references
    const edges = template.edges.map(edge => ({
        ...edge,
        id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: idMap.get(edge.source) || edge.source,
        target: idMap.get(edge.target) || edge.target
    }));

    return {
        id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: projectName,
        description: template.description,
        templateId: template.id,
        nodes,
        edges,
        status: 'planning',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}
