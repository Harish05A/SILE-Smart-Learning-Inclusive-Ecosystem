import asyncio
from typing import List, Dict, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import async_session_factory
from app.models.curriculum import (
    Subject,
    Topic,
    Skill,
    LearningContent,
    ContentDifficulty,
    ContentType,
)

# ==============================================================================
# PHASE 2 MATHEMATICS CURRICULUM SEED DATASET
# ==============================================================================

MATH_SUBJECT_DATA = {
    "code": "MATH",
    "name": "Mathematics",
    "description": "Foundational and secondary mathematics covering number systems, fractions, percentages, algebra, and geometry.",
    "order_number": 1,
}

CURRICULUM_DATA: List[Dict[str, Any]] = [
    # --------------------------------------------------------------------------
    # 1. Number System
    # --------------------------------------------------------------------------
    {
        "code": "MATH_NUM",
        "name": "Number System",
        "description": "Place values, rounding, factors, primes, and order of operations.",
        "order_number": 1,
        "prerequisite_code": None,
        "skills": [
            {
                "name": "Place Value and Rounding",
                "description": "Understand digits position up to millions and standard rounding rules.",
                "difficulty_level": ContentDifficulty.BEGINNER,
                "order_number": 1,
            },
            {
                "name": "Prime Numbers and Factorization",
                "description": "Distinguish primes from composites and construct prime factor trees.",
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "order_number": 2,
            },
            {
                "name": "Order of Operations (PEMDAS)",
                "description": "Evaluate multi-operation expressions with parentheses, exponents, multiplication, division, addition, and subtraction.",
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "order_number": 3,
            },
        ],
        "contents": [
            {
                "title": "Understanding Place Value and Expanded Form",
                "description": "Learn how the position of each digit determines its numerical value.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.BEGINNER,
                "estimated_duration_minutes": 5,
                "prerequisites": [],
                "content_body": """# Place Value & Number Structure

In our base-10 number system, the **position** of each digit determines its total value:
* In the number **4,382**:
  * **4** is in the thousands place ($4 \\times 1,000 = 4,000$)
  * **3** is in the hundreds place ($3 \\times 100 = 300$)
  * **8** is in the tens place ($8 \\times 10 = 80$)
  * **2** is in the ones place ($2 \\times 1 = 2$)

### Example:
Write **5,290** in expanded form:
$$\\text{Expanded Form} = 5,000 + 200 + 90 + 0$$
""",
                "media_payload": {"scaffold_type": "place_value_chart", "digits": [5, 2, 9, 0]},
            },
            {
                "title": "Prime Numbers and Factor Trees",
                "description": "Deconstruct whole numbers into prime factors using systematic factor trees.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "estimated_duration_minutes": 6,
                "prerequisites": ["MATH_NUM"],
                "content_body": """# Prime vs. Composite Numbers

* **Prime Number**: A whole number greater than 1 with exactly two distinct factors: 1 and itself (e.g. 2, 3, 5, 7, 11, 13).
* **Composite Number**: A number that can be divided evenly by numbers other than 1 and itself (e.g. 4, 6, 8, 9, 12).

### Example: Prime Factorization of 36
1. Divide 36 by 2: $36 = 2 \\times 18$
2. Divide 18 by 2: $18 = 2 \\times 9$
3. Divide 9 by 3: $9 = 3 \\times 3$
4. **Final Prime Factors**: $2 \\times 2 \\times 3 \\times 3 = 2^2 \\times 3^2$
""",
                "media_payload": {"tree_root": 36, "factors": [2, 2, 3, 3]},
            },
            {
                "title": "Order of Operations: Mastering PEMDAS",
                "description": "Step-by-step guide to evaluating expressions without operational ambiguity.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "estimated_duration_minutes": 7,
                "prerequisites": ["MATH_NUM"],
                "content_body": """# Order of Operations (PEMDAS)

When evaluating expressions with multiple operations, always follow **PEMDAS**:
1. **P**arentheses: Compute grouped terms first: $(3 + 5)$
2. **E**xponents: Evaluate powers: $2^3 = 8$
3. **M**ultiplication & **D**ivision: Left to right
4. **A**ddition & **S**ubtraction: Left to right

### Example:
Evaluate: $8 + 2 \\times (5 - 1)^2 \\div 4$

* **Step 1 (Parentheses)**: $5 - 1 = 4 \\implies 8 + 2 \\times 4^2 \\div 4$
* **Step 2 (Exponents)**: $4^2 = 16 \\implies 8 + 2 \\times 16 \\div 4$
* **Step 3 (Multiplication)**: $2 \\times 16 = 32 \\implies 8 + 32 \\div 4$
* **Step 4 (Division)**: $32 \\div 4 = 8 \\implies 8 + 8$
* **Step 5 (Addition)**: $8 + 8 = 16$
""",
                "media_payload": {"steps": 5, "rule": "PEMDAS"},
            },
            {
                "title": "Multi-Step Numerical Reasoning & Word Problems",
                "description": "Apply arithmetic properties to solve real-world logistical challenges.",
                "content_type": ContentType.EXAMPLE,
                "difficulty_level": ContentDifficulty.ADVANCED,
                "estimated_duration_minutes": 8,
                "prerequisites": ["MATH_NUM"],
                "content_body": """# Applied Numerical Reasoning

### Real-World Problem:
A school bus holds 48 students. There are 315 students going on a field trip. 
1. How many full buses will be required?
2. How many students will be on the final bus?

### Solution:
* **Step 1**: Divide $315 \\div 48$:
  $$315 \\div 48 = 6 \\text{ with a remainder of } 27$$
* **Step 2**: 6 full buses carry $6 \\times 48 = 288$ students.
* **Step 3**: The remaining $315 - 288 = 27$ students require a 7th bus.
* **Conclusion**: 7 total buses needed; the last bus carries 27 students.
""",
                "media_payload": {"total": 315, "bus_capacity": 48},
            },
        ],
    },
    # --------------------------------------------------------------------------
    # 2. Fractions
    # --------------------------------------------------------------------------
    {
        "code": "MATH_FRAC",
        "name": "Fractions",
        "description": "Understanding parts of a whole, equivalent fractions, arithmetic operations, and applications.",
        "order_number": 2,
        "prerequisite_code": "MATH_NUM",
        "skills": [
            {
                "name": "Numerator and Denominator",
                "description": "Identify the top (parts counted) and bottom (total equal parts) in a fraction.",
                "difficulty_level": ContentDifficulty.BEGINNER,
                "order_number": 1,
            },
            {
                "name": "Comparing and Equivalent Fractions",
                "description": "Scale fractions by multiplying/dividing by common factors.",
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "order_number": 2,
            },
            {
                "name": "Adding and Subtracting Unlike Fractions",
                "description": "Find common denominators to add or subtract fractions accurately.",
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "order_number": 3,
            },
            {
                "name": "Fraction Word Problems and Operations",
                "description": "Solve multi-step real-world fractional allocation problems.",
                "difficulty_level": ContentDifficulty.ADVANCED,
                "order_number": 4,
            },
        ],
        "contents": [
            {
                "title": "Understanding Fractions: Numerator and Denominator",
                "description": "Visualize fractions as equal divisions of a single unit or set.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.BEGINNER,
                "estimated_duration_minutes": 5,
                "prerequisites": ["MATH_NUM"],
                "content_body": """# Introduction to Fractions

A fraction represents part of a whole:
$$\\text{Fraction} = \\frac{\\text{Numerator (Parts Chosen)}}{\\text{Denominator (Total Equal Parts)}}$$

* In $\\frac{3}{8}$:
  * **3** is the **numerator**: we have 3 parts.
  * **8** is the **denominator**: the whole is divided into 8 equal slices.

### Visual Example:
If a pizza is cut into 8 equal slices and you eat 3 slices, you have eaten $\\frac{3}{8}$ of the pizza.
There are $\\frac{5}{8}$ of the pizza remaining.
""",
                "media_payload": {"visual_model": "pie_chart", "numerator": 3, "denominator": 8},
            },
            {
                "title": "Comparing and Finding Equivalent Fractions",
                "description": "Learn to identify fractions that represent the same value using scaling.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "estimated_duration_minutes": 6,
                "prerequisites": ["MATH_FRAC"],
                "content_body": """# Equivalent Fractions

Fractions that have different numerators and denominators but equal value are called **equivalent fractions**:
$$\\frac{1}{2} = \\frac{2}{4} = \\frac{4}{8} = \\frac{5}{10}$$

### Rule for Equivalence:
Multiply or divide both the numerator and denominator by the **same non-zero number**:
$$\\frac{3}{4} \\times \\frac{3}{3} = \\frac{9}{12}$$

### Simplifying Fractions:
Divide numerator and denominator by their **Greatest Common Factor (GCF)**:
$$\\frac{12}{18} \\div \\frac{6}{6} = \\frac{2}{3}$$
""",
                "media_payload": {"pairs": [["1/2", "2/4"], ["3/4", "9/12"], ["12/18", "2/3"]]},
            },
            {
                "title": "Adding and Subtracting Fractions with Unlike Denominators",
                "description": "Find Least Common Denominators (LCD) to add and subtract fractions.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "estimated_duration_minutes": 7,
                "prerequisites": ["MATH_FRAC"],
                "content_body": """# Adding Unlike Fractions

You cannot directly add fractions with different denominators. You must first find a **Common Denominator**:

### Step-by-Step Example:
Calculate: $\\frac{2}{3} + \\frac{1}{6}$

* **Step 1**: Find the Least Common Denominator of 3 and 6 $\\implies \\text{LCD} = 6$.
* **Step 2**: Convert $\\frac{2}{3}$ so denominator is 6:
  $$\\frac{2}{3} \\times \\frac{2}{2} = \\frac{4}{6}$$
* **Step 3**: Add numerators across the shared denominator:
  $$\\frac{4}{6} + \\frac{1}{6} = \\frac{4 + 1}{6} = \\frac{5}{6}$$
""",
                "media_payload": {"operation": "addition", "lcd": 6, "result": "5/6"},
            },
            {
                "title": "Real-World Fraction Problem Solving",
                "description": "Apply fractional multiplication and division to multi-step word problems.",
                "content_type": ContentType.EXAMPLE,
                "difficulty_level": ContentDifficulty.ADVANCED,
                "estimated_duration_minutes": 8,
                "prerequisites": ["MATH_FRAC"],
                "content_body": """# Advanced Fraction Word Problems

### Problem:
Maria has $\\frac{3}{4}$ of a gallon of paint. She uses $\\frac{2}{3}$ of what she has to paint her bedroom. 
What fraction of a gallon did she use?

### Solution:
* **Step 1**: Multiply the two fractions:
  $$\\text{Paint Used} = \\frac{3}{4} \\times \\frac{2}{3}$$
* **Step 2**: Multiply numerators and denominators:
  $$\\frac{3 \\times 2}{4 \\times 3} = \\frac{6}{12}$$
* **Step 3**: Simplify by dividing by 6:
  $$\\frac{6 \\div 6}{12 \\div 6} = \\frac{1}{2} \\text{ gallon}$$
""",
                "media_payload": {"initial": "3/4", "fraction_used": "2/3", "answer": "1/2"},
            },
        ],
    },
    # --------------------------------------------------------------------------
    # 3. Percentages
    # --------------------------------------------------------------------------
    {
        "code": "MATH_PERC",
        "name": "Percentages",
        "description": "Parts of 100, fraction/decimal conversions, calculating percentages, and retail discounts.",
        "order_number": 3,
        "prerequisite_code": "MATH_FRAC",
        "skills": [
            {
                "name": "Understanding Percentages",
                "description": "Recognize percentages as proportions out of 100.",
                "difficulty_level": ContentDifficulty.BEGINNER,
                "order_number": 1,
            },
            {
                "name": "Fractions to Percentages Conversion",
                "description": "Convert fractions and decimals to percentage representations.",
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "order_number": 2,
            },
            {
                "name": "Calculating Percentages of Values",
                "description": "Compute a percentage of any given numerical value.",
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "order_number": 3,
            },
            {
                "name": "Discounts and Real-World Percentages",
                "description": "Calculate markups, discounts, tax, and percentage change.",
                "difficulty_level": ContentDifficulty.ADVANCED,
                "order_number": 4,
            },
        ],
        "contents": [
            {
                "title": "What is a Percentage? Parts Out of 100",
                "description": "Learn how percentages represent fractions with a denominator of 100.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.BEGINNER,
                "estimated_duration_minutes": 5,
                "prerequisites": ["MATH_FRAC"],
                "content_body": """# Introduction to Percentages

The word **Percent** comes from *per centum*, meaning **"out of 100"**:
* $50\\% = \\frac{50}{100} = 0.50 = \\frac{1}{2}$
* $25\\% = \\frac{25}{100} = 0.25 = \\frac{1}{4}$
* $75\\% = \\frac{75}{100} = 0.75 = \\frac{3}{4}$
* $100\\% = \\frac{100}{100} = 1.0 = \\text{The entire whole}$

### Visual Model:
Imagine a grid with 100 squares. If 40 squares are shaded blue, that represents **$40\\%$** of the grid.
""",
                "media_payload": {"grid_size": 100, "shaded": 40},
            },
            {
                "title": "Converting Between Fractions, Decimals, and Percentages",
                "description": "Master the conversion triangle between fractions, decimals, and percents.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "estimated_duration_minutes": 6,
                "prerequisites": ["MATH_PERC"],
                "content_body": """# Conversions

### 1. Fraction to Percent:
Multiply the fraction by 100:
$$\\frac{3}{5} \\times 100\\% = \\frac{300}{5}\\% = 60\\%$$

### 2. Decimal to Percent:
Shift decimal point two places to the right:
$$0.075 \\implies 7.5\\%$$

### 3. Percent to Decimal:
Divide by 100 (shift decimal point two places to the left):
$$85\\% \\implies 0.85$$
""",
                "media_payload": {"sample_conversions": [["3/5", "0.6", "60%"], ["1/4", "0.25", "25%"]]},
            },
            {
                "title": "Calculating the Percentage of a Number",
                "description": "Learn to calculate percentages like 15% of $80 or 20% of 250.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "estimated_duration_minutes": 6,
                "prerequisites": ["MATH_PERC"],
                "content_body": """# Finding Percent of a Quantity

To find the percentage of any quantity:
$$\\text{Value} = \\text{Decimal/Fraction form of Percent} \\times \\text{Total}$$

### Example 1:
What is $15\\%$ of $80$?
* **Step 1**: Convert $15\\%$ to a decimal: $0.15$
* **Step 2**: Multiply:
  $$0.15 \\times 80 = 12$$

### Example 2:
What is $20\\%$ of $250$?
* $$0.20 \\times 250 = 50$$
""",
                "media_payload": {"formula": "P * Total", "example": "0.15 * 80 = 12"},
            },
            {
                "title": "Calculating Discounts, Tax, and Final Prices",
                "description": "Solve practical shopping problems with percentage markdowns.",
                "content_type": ContentType.EXAMPLE,
                "difficulty_level": ContentDifficulty.ADVANCED,
                "estimated_duration_minutes": 7,
                "prerequisites": ["MATH_PERC"],
                "content_body": """# Discount & Retail Applications

### Problem:
A jacket originally costs $120. During a holiday sale, it is discounted by $25\\%$.
How much do you pay for the jacket?

### Method 1 (Calculate Discount First):
* **Step 1**: Find discount amount:
  $$\\text{Discount} = 0.25 \\times 120 = $30$$
* **Step 2**: Subtract discount from original price:
  $$\\text{Final Price} = 120 - 30 = $90$$

### Method 2 (Calculate Remaining Percent):
* Since discount is $25\\%$, you pay $100\\% - 25\\% = 75\\%$:
  $$\\text{Final Price} = 0.75 \\times 120 = $90$$
""",
                "media_payload": {"original_price": 120, "discount_pct": 25, "final_price": 90},
            },
        ],
    },
    # --------------------------------------------------------------------------
    # 4. Basic Algebra
    # --------------------------------------------------------------------------
    {
        "code": "MATH_ALG",
        "name": "Basic Algebra",
        "description": "Variables, expressions, solving 1-step and 2-step linear equations.",
        "order_number": 4,
        "prerequisite_code": "MATH_NUM",
        "skills": [
            {
                "name": "Variables and Expressions",
                "description": "Understand symbols representing unknown numbers and evaluate expressions.",
                "difficulty_level": ContentDifficulty.BEGINNER,
                "order_number": 1,
            },
            {
                "name": "One-Step Linear Equations",
                "description": "Use inverse operations to isolate a single variable in addition or multiplication.",
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "order_number": 2,
            },
            {
                "name": "Two-Step Linear Equations",
                "description": "Solve equations of form ax + b = c by undoing operations systematically.",
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "order_number": 3,
            },
            {
                "name": "Algebraic Word Problems",
                "description": "Formulate algebraic equations from verbal statements and solve.",
                "difficulty_level": ContentDifficulty.ADVANCED,
                "order_number": 4,
            },
        ],
        "contents": [
            {
                "title": "Introduction to Variables and Algebraic Expressions",
                "description": "Learn how letters represent numbers in mathematical formulas.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.BEGINNER,
                "estimated_duration_minutes": 5,
                "prerequisites": ["MATH_NUM"],
                "content_body": """# What is a Variable?

In algebra, a **variable** is a letter (such as $x, y, a, b$) that stands for an unknown quantity:
* **Expression**: A mathematical phrase without an equals sign: $3x + 7$
* **Equation**: A mathematical statement that two expressions are equal: $3x + 7 = 22$

### Evaluating an Expression:
If $x = 4$, what is the value of $5x - 3$?
* Replace $x$ with 4:
  $$5(4) - 3 = 20 - 3 = 17$$
""",
                "media_payload": {"variable": "x", "sample_val": 4, "result": 17},
            },
            {
                "title": "Solving One-Step Equations Using Inverse Operations",
                "description": "Isolate the variable by undoing addition, subtraction, multiplication, or division.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "estimated_duration_minutes": 6,
                "prerequisites": ["MATH_ALG"],
                "content_body": """# Inverse Operations

To solve an equation, whatever you do to one side, you **must do to the other side**:
* **Addition** undoes **Subtraction**
* **Multiplication** undoes **Division**

### Example 1:
Solve: $x + 9 = 24$
* Subtract 9 from both sides:
  $$x + 9 - 9 = 24 - 9 \\implies x = 15$$

### Example 2:
Solve: $4y = 36$
* Divide both sides by 4:
  $$\\frac{4y}{4} = \\frac{36}{4} \\implies y = 9$$
""",
                "media_payload": {"equations": ["x + 9 = 24 -> x = 15", "4y = 36 -> y = 9"]},
            },
            {
                "title": "Solving Two-Step Linear Equations (ax + b = c)",
                "description": "Learn the standard 2-step procedure to isolate variables.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "estimated_duration_minutes": 7,
                "prerequisites": ["MATH_ALG"],
                "content_body": """# Two-Step Equations

When solving $ax + b = c$:
1. **Step 1**: Eliminate the constant term (+ or -) using inverse operation.
2. **Step 2**: Eliminate the coefficient (multiply or divide) to isolate $x$.

### Example:
Solve for $x$: $3x + 7 = 22$

* **Step 1**: Subtract 7 from both sides:
  $$3x + 7 - 7 = 22 - 7 \\implies 3x = 15$$
* **Step 2**: Divide both sides by 3:
  $$\\frac{3x}{3} = \\frac{15}{3} \\implies x = 5$$

### Verification:
Check by substituting $x = 5$ into original equation:
$$3(5) + 7 = 15 + 7 = 22 \\quad \\checkmark$$
""",
                "media_payload": {"equation": "3x + 7 = 22", "steps": ["3x = 15", "x = 5"]},
            },
            {
                "title": "Translating Real-World Scenarios into Equations",
                "description": "Build equations from word descriptions and solve for unknowns.",
                "content_type": ContentType.EXAMPLE,
                "difficulty_level": ContentDifficulty.ADVANCED,
                "estimated_duration_minutes": 8,
                "prerequisites": ["MATH_ALG"],
                "content_body": """# Algebraic Word Problems

### Problem:
Liam bought 4 books that all cost the same price, plus a $5 bookmark.
His total bill was $45. How much did each book cost?

### Solution:
* **Step 1**: Define the variable: Let $b$ = cost of one book.
* **Step 2**: Write the equation:
  $$4b + 5 = 45$$
* **Step 3**: Subtract 5 from both sides:
  $$4b = 40$$
* **Step 4**: Divide by 4:
  $$b = 10$$
* **Answer**: Each book costs **$10**.
""",
                "media_payload": {"scenario": "4 books + $5 bookmark = $45", "answer": "$10"},
            },
        ],
    },
    # --------------------------------------------------------------------------
    # 5. Geometry
    # --------------------------------------------------------------------------
    {
        "code": "MATH_GEOM",
        "name": "Geometry",
        "description": "2D shapes, perimeter of polygons, area of rectangles and triangles, and composite figures.",
        "order_number": 5,
        "prerequisite_code": "MATH_NUM",
        "skills": [
            {
                "name": "Properties of 2D Shapes",
                "description": "Identify triangles, quadrilaterals, parallel sides, and right angles.",
                "difficulty_level": ContentDifficulty.BEGINNER,
                "order_number": 1,
            },
            {
                "name": "Perimeter of Polygons",
                "description": "Calculate total boundary distance around any closed polygon.",
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "order_number": 2,
            },
            {
                "name": "Area of Rectangles and Triangles",
                "description": "Compute enclosed surface area using standard geometric formulas.",
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "order_number": 3,
            },
            {
                "name": "Area of Composite Figures",
                "description": "Deconstruct complex polygons into standard rectangles and triangles.",
                "difficulty_level": ContentDifficulty.ADVANCED,
                "order_number": 4,
            },
        ],
        "contents": [
            {
                "title": "Properties of 2D Shapes and Angles",
                "description": "Explore the fundamental geometric characteristics of polygons.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.BEGINNER,
                "estimated_duration_minutes": 5,
                "prerequisites": ["MATH_NUM"],
                "content_body": """# 2D Shapes & Geometric Properties

* **Triangle**: 3 sides, 3 angles (angles always sum to $180^\\circ$).
* **Rectangle**: 4 sides, opposite sides equal and parallel, 4 right angles ($90^\\circ$).
* **Square**: 4 equal sides, 4 right angles ($90^\\circ$).
* **Parallelogram**: 4 sides with opposite sides parallel and equal in length.

### Angles:
* **Acute Angle**: Less than $90^\\circ$
* **Right Angle**: Exactly $90^\\circ$
* **Obtuse Angle**: Between $90^\\circ$ and $180^\\circ$
""",
                "media_payload": {"shapes": ["Triangle", "Rectangle", "Square", "Parallelogram"]},
            },
            {
                "title": "Finding the Perimeter of Polygons",
                "description": "Calculate the total distance around the boundary of a shape.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.DEVELOPING,
                "estimated_duration_minutes": 6,
                "prerequisites": ["MATH_GEOM"],
                "content_body": """# Calculating Perimeter

**Perimeter** is the total distance around the outside edge of a shape:
$$\\text{Perimeter} = \\text{Sum of all side lengths}$$

### Examples:
1. **Rectangle** with length $l = 8\\text{ cm}$ and width $w = 5\\text{ cm}$:
   $$\\text{Perimeter} = 2(l + w) = 2(8 + 5) = 2(13) = 26\\text{ cm}$$
2. **Triangle** with sides $3\\text{ cm}, 4\\text{ cm}, 5\\text{ cm}$:
   $$\\text{Perimeter} = 3 + 4 + 5 = 12\\text{ cm}$$
""",
                "media_payload": {"formula": "2(l + w)", "sample": "2*(8+5)=26"},
            },
            {
                "title": "Calculating the Area of Rectangles and Triangles",
                "description": "Apply standard area formulas to compute surface coverage.",
                "content_type": ContentType.EXPLANATION,
                "difficulty_level": ContentDifficulty.PROFICIENT,
                "estimated_duration_minutes": 7,
                "prerequisites": ["MATH_GEOM"],
                "content_body": """# Area Formulas

**Area** measures the amount of space inside a shape (in square units, e.g. $\\text{cm}^2, \\text{m}^2$):

### 1. Area of a Rectangle:
$$\\text{Area} = \\text{length} \\times \\text{width} = l \\times w$$
* Example: $l = 8\\text{ cm}, w = 5\\text{ cm} \\implies \\text{Area} = 8 \\times 5 = 40\\text{ cm}^2$

### 2. Area of a Triangle:
$$\\text{Area} = \\frac{1}{2} \\times \\text{base} \\times \\text{height} = \\frac{b \\times h}{2}$$
* Example: Base $b = 6\\text{ cm}$, Height $h = 8\\text{ cm}$:
  $$\\text{Area} = \\frac{6 \\times 8}{2} = \\frac{48}{2} = 24\\text{ cm}^2$$
""",
                "media_payload": {"rectangle_area": "l * w", "triangle_area": "0.5 * b * h"},
            },
            {
                "title": "Decomposing Composite and L-Shaped Figures",
                "description": "Split complex geometric outlines into manageable rectangles and triangles.",
                "content_type": ContentType.EXAMPLE,
                "difficulty_level": ContentDifficulty.ADVANCED,
                "estimated_duration_minutes": 8,
                "prerequisites": ["MATH_GEOM"],
                "content_body": """# Area of Composite Shapes

### Problem:
An L-shaped garden can be split into two rectangles:
* **Rectangle A**: $6\\text{ m} \\times 4\\text{ m}$
* **Rectangle B**: $3\\text{ m} \\times 2\\text{ m}$

What is the total area of the garden?

### Solution:
* **Step 1**: Find Area of Rectangle A:
  $$\\text{Area}_A = 6 \\times 4 = 24\\text{ m}^2$$
* **Step 2**: Find Area of Rectangle B:
  $$\\text{Area}_B = 3 \\times 2 = 6\\text{ m}^2$$
* **Step 3**: Add the areas:
  $$\\text{Total Area} = 24 + 6 = 30\\text{ m}^2$$
""",
                "media_payload": {"parts": [{"name": "A", "area": 24}, {"name": "B", "area": 6}], "total": 30},
            },
        ],
    },
]


async def seed_curriculum_and_content(db: AsyncSession):
    """
    Safely and idempotently seed the Mathematics curriculum (5 topics, 19 skills, 20 content modules).
    """
    print("[CURRICULUM SEED] Checking Mathematics subject...")

    # 1. Subject
    stmt = select(Subject).where(Subject.code == MATH_SUBJECT_DATA["code"])
    res = await db.execute(stmt)
    subject = res.scalar_one_or_none()

    if not subject:
        subject = Subject(
            code=MATH_SUBJECT_DATA["code"],
            name=MATH_SUBJECT_DATA["name"],
            description=MATH_SUBJECT_DATA["description"],
            order_number=MATH_SUBJECT_DATA["order_number"],
        )
        db.add(subject)
        await db.flush()
        print(f"[CURRICULUM SEED] Created subject '{subject.name}' ({subject.code})")

    # Topic code to topic map
    topic_map: Dict[str, Topic] = {}

    # 2. Topics & Prerequisites
    for topic_data in CURRICULUM_DATA:
        t_stmt = select(Topic).where(Topic.code == topic_data["code"])
        t_res = await db.execute(t_stmt)
        topic = t_res.scalar_one_or_none()

        prereq_id = None
        if topic_data["prerequisite_code"] and topic_data["prerequisite_code"] in topic_map:
            prereq_id = topic_map[topic_data["prerequisite_code"]].id

        if not topic:
            topic = Topic(
                subject_id=subject.id,
                prerequisite_topic_id=prereq_id,
                code=topic_data["code"],
                name=topic_data["name"],
                description=topic_data["description"],
                order_number=topic_data["order_number"],
            )
            db.add(topic)
            await db.flush()
            print(f"[CURRICULUM SEED] Created topic '{topic.name}' ({topic.code})")
        else:
            if prereq_id and topic.prerequisite_topic_id != prereq_id:
                topic.prerequisite_topic_id = prereq_id
                await db.flush()

        topic_map[topic.code] = topic

        # 3. Skills
        skill_map: Dict[str, Skill] = {}
        for s_data in topic_data["skills"]:
            s_stmt = select(Skill).where(Skill.topic_id == topic.id, Skill.name == s_data["name"])
            s_res = await db.execute(s_stmt)
            skill = s_res.scalar_one_or_none()

            if not skill:
                skill = Skill(
                    topic_id=topic.id,
                    name=s_data["name"],
                    description=s_data["description"],
                    difficulty_level=s_data["difficulty_level"],
                    order_number=s_data["order_number"],
                )
                db.add(skill)
                await db.flush()
            skill_map[skill.name] = skill

        # 4. Learning Content
        for c_data in topic_data["contents"]:
            c_stmt = select(LearningContent).where(
                LearningContent.topic_id == topic.id,
                LearningContent.title == c_data["title"],
            )
            c_res = await db.execute(c_stmt)
            content = c_res.scalar_one_or_none()

            # Associate with matching skill if difficulty aligns
            associated_skill = next(
                (sk for sk in skill_map.values() if sk.difficulty_level == c_data["difficulty_level"]),
                None,
            )

            if not content:
                content = LearningContent(
                    subject_id=subject.id,
                    topic_id=topic.id,
                    skill_id=associated_skill.id if associated_skill else None,
                    title=c_data["title"],
                    description=c_data["description"],
                    content_type=c_data["content_type"],
                    content_body=c_data["content_body"].strip(),
                    media_payload=c_data.get("media_payload"),
                    difficulty_level=c_data["difficulty_level"],
                    estimated_duration_minutes=c_data["estimated_duration_minutes"],
                    prerequisites=c_data.get("prerequisites", []),
                )
                db.add(content)

    await db.commit()
    print("[CURRICULUM SEED] Successfully verified/seeded 5 topics, skills, and 20 content items.")


async def main():
    async with async_session_factory() as session:
        await seed_curriculum_and_content(session)


if __name__ == "__main__":
    asyncio.run(main())
