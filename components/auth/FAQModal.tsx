import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';

interface FAQModalProps {
  onClose: () => void;
}

export const FAQModal: React.FC<FAQModalProps> = ({ onClose }) => {
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);

  const faqData = [
    {
      question: "Is this real?",
      answer: "Yes. DaPaint runs real daily head-to-head challenges with cash prizes. Lock in to compete in the live pool.",
    },
    {
      question: "What are the challenges?",
      answer: "Create your DaPaint and enter a 1:1 showdown. Each challenge runs for a set window and only one DaPaint wins.",
    },
    {
      question: "Who can enter?",
      answer: "Everyone. That's why it's fair.",
    },
    {
      question: "How do I start?",
      answer: "Sign up, create your DaPaint, then tap lock in. You can also join from the feed if a slot is open.",
    },
    {
      question: "What happens when I lock in?",
      answer: "Your DaPaint goes live against another entry. You'll see it in your active feed until the challenge ends.",
    },
    {
      question: "Can I just watch?",
      answer: "Yes. Browse the feed, explore DaPaints, and join when you're ready to compete.",
    },
    {
      question: "What devices are supported?",
      answer: "DaPaint works on mobile and web. The experience adapts to both, including keyboard handling on mobile.",
    },
    {
      question: "Do I need an account?",
      answer: "Yes. You'll sign in with a username and password so we can keep your DaPaints and prizes tied to you.",
    },
    {
      question: "Lock in or watch someone else rep your people?",
      answer: "Your choice.",
    },
  ];

  if (showSubmissionForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Ask a Question</Text>
          <Pressable onPress={() => setShowSubmissionForm(false)}>
            <Text style={styles.closeButton}>x</Text>
          </Pressable>
        </View>
        <Text style={styles.description}>Submit your question and we'll get back to you soon.</Text>
        <View style={styles.formPlaceholder}>
          <Text style={styles.placeholderText}>Question Submission Form</Text>
        </View>
        <Pressable style={styles.submitButton}>
          <Text style={styles.submitButtonText}>Submit Question</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Frequently Asked Questions</Text>
          <Text style={styles.subtitle}>Quick answers before you get started</Text>
        </View>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close FAQ">
          <Text style={styles.closeButton}>x</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {faqData.map((faq, index) => (
          <View
            key={index}
            style={[
              styles.faqItem,
              index !== faqData.length - 1 && styles.faqItemDivider,
            ]}
          >
            <Text style={styles.question}>{faq.question}</Text>
            <Text style={styles.answer}>{faq.answer}</Text>
          </View>
        ))}
      </ScrollView>

      <Pressable 
        style={styles.askButton}
        onPress={() => setShowSubmissionForm(true)}
      >
        <Text style={styles.askButtonText}>Ask a Question</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '92%',
    maxWidth: Platform.OS === 'web' ? 640 : 520,
    maxHeight: '78%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,92,130,0.18)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0px 6px 14px rgba(0,0,0,0.18)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 6,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#005c82',
  },
  subtitle: {
    fontSize: 13,
    color: '#4f6b77',
    marginTop: 4,
  },
  closeButton: {
    fontSize: 24,
    color: '#005c82',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scrollContainer: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  faqItem: {
    paddingVertical: 14,
  },
  faqItemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,92,130,0.12)',
  },
  question: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#003d57',
  },
  answer: {
    fontSize: 14,
    color: '#4f6b77',
    lineHeight: 20,
  },
  askButton: {
    backgroundColor: '#005c82',
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  askButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  formPlaceholder: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  submitButton: {
    backgroundColor: '#005c82',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
